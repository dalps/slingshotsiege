const empty = new Map();
const components = new Set();
const ecsComponentMask: unique symbol = Symbol("m");
let bit = 0;

type Mask = bigint;

interface RawComponent {
  constructor: Function;
  destructor?: Function;
}

interface WithMask {
  [ecsComponentMask]: Mask;
}

interface RegisteredComponent<T> extends WithMask {
  constructor?: (new (...args: any[]) => T) & WithMask;
  destructor?: Function;
}

type AnyComponent = RegisteredComponent<any>;

type Components = AnyComponent[];

interface System {
  update(...args: any[]): void;
}

export class Entity {
  private _world: World;
  private _components: Map<Mask, RegisteredComponent<any>>;
  private _mask: Mask;

  constructor(world: World) {
    this._world = world;
    this._components = new Map();
    this._mask = BigInt(0);
  }

  /**
   * The property is used to determine whether an entity is in the world or has already been removed from it. If the entity is deleted, it returns `null`, otherwise it returns the entity itself. When saving references to entities, this property should always be checked before operations on them. It should be borne in mind that such a check does not need to be done for entities received from requests - the entities are guaranteed to be relevant there.
   *
   * ```javascript
   * class TargetingSystem {
   *     constructor(world) {
   *         this.query = world.query(Unit);
   *     }
   *
   *     update(delta) {
   *         this.query.iterate((unit) => {
   *             if (!unit.target?.exists) {
   *                 // unit.target is not set, or the entity that the target points to has lost its relevance
   *                 // find a new target
   *                 // ...
   *             }
   *         });
   *     }
   * }
   * ```
   */
  get exists(): this | null {
    return this._components === empty ? null : this;
  }

  /**
   * Adds components to the entity. The method waits for instances of previously registered classes. If the transferred component is already present in the entity, the old component will be deleted (with a call to the destructor, if any) and replaced with a new one. Returns the entity itself.
   */
  add(...components: Components) {
    if (this.exists) {
      components.forEach((component) => {
        const mask = component?.constructor?.[ecsComponentMask];
        if (mask) {
          this._components.get(mask)?.destructor?.(this);
          this._components.set(mask, component);
          this._mask |= mask;
        }
      });

      this._world._matchEntity(this);
    }

    return this;
  }

  /**
   * Removes components from the entity. The method expects previously registered classes. If a component has a destructor, it calls it before deleting it. Returns the entity itself.
   */
  remove(...Components: Components) {
    if (this.exists) {
      Components.forEach((Component) => {
        const mask = Component[ecsComponentMask];
        const component = this._components.get(mask);

        if (component) {
          component.destructor?.(this);
          this._components.delete(mask);
          this._mask &= ~mask;
        }
      });

      this._world._matchEntity(this);
    }

    return this;
  }

  /**
   * Returns the specified components of the entity. The method expects previously registered classes. If only one component is requested, the method will return the requested component, if more than one component is requested, the method will return an array of components in the same order. If the entity does not have the requested component, `null` is returned.
   */
  get(...Components: RawComponent[]): any[] {
    const result = Components.map(
      (Component) => this._components.get(Component[ecsComponentMask]) || null,
    );
    return result;
  }

  getComponent<T = any>(Component: T): InstanceType<T> | undefined {
    return this._components.get(Component[ecsComponentMask]);
  }

  /**
   * Removes an entity from the world by first clearing it of its components and calling their destructors.
   */
  delete() {
    this._components.forEach((component) => component.destructor?.(this));
    this._world._queries.forEach((query) => query._remove(this));
    this._world._entities.delete(this);
    this._components = empty;
  }
}

export class Query {
  private _set: Set<Entity>;

  /**
   * The queried components.
   */
  private _components: Components;
  private _mask: Mask;
  private _match: (e: Entity) => void;

  constructor(
    world: World,
    mask: Mask,
    Components: Components,
    parent?: Query,
  ) {
    const set = parent?._set || new Set();
    this._set = set;
    this._mask = mask;
    this._components = Components;

    this._match = (entity) => {
      (mask && (mask & entity._mask) === mask && set.add(entity)) ||
        set.delete(entity);
    };

    !parent && world._entities.forEach(this._match);
  }

  private _check(Components: Components) {
    return this._components.every((c, i) => c === Components[i]);
  }

  private _remove(entity: Entity) {
    this._set.delete(entity);
  }

  /**
   * Iterates through all the entities in the query.
   */
  iterate(fn: (e: Entity, ...c: any[]) => void) {
    this._set.forEach((entity) =>
      fn(entity, ...entity.get(...this._components)),
    );
  }

  /**
   * The number of entities that satisfied the query.
   */
  get length() {
    return this._set.size;
  }
}

export class World {
  private _queries: Query[];
  private _entities: Set<Entity>;

  constructor() {
    this._queries = [];
    this._entities = new Set();
  }

  private _matchEntity(entity: Entity) {
    this._queries.forEach((query) => query._match(entity));
  }

  /**
   * Creates and returns an empty entity.
   */
  create() {
    const entity = new Entity(this);
    this._entities.add(entity);
    return entity;
  }

  /**
   * Returns a set of entities that are guaranteed to contain components of all specified classes. The set is updated automatically and is always up to date.
   *
   * The set has the `length` property, which stores the number of entities in the set, and the `iterate(iterator)` method, which allows you to iterate through all the entities in the set.
   *
   * ```javascript
   * class MovementSystem {
   *     constructor(world) {
   *         const query = world.query(Position, Velocity);
   *
   *         this.update = (delta) => {
   *             const movement = ([position, velocity], entity) => {
   *                 position.x += velocity.x * delta;
   *                 position.y += velocity.y * delta;
   *                 position.rotation += velocity.rotation * delta;
   *             };
   *
   *             query.iterate(movement);
   *         };
   *     }
   * }
   * ```
   * In this example, the set entities are iterated using the `movement` function, which is applied to each entity that simultaneously has both a `Position` component and a `Velocity` component. The first argument to this function is an array of components in the same order in which they were set when creating the set. If the set is specified by a single component, then the argument will come not from the array, but from the specified component. The second argument for this function is the entity itself (it is not used in this example).
   *
   * Queries are the main way systems are implemented. Usually, a request is created when the system is created and used in the `update` method.
   */
  query(...Components: RawComponent[]) {
    const mask = Components.reduce(
      (mask, Component) => (mask |= Component[ecsComponentMask]),
      BigInt(0),
    );

    let query = this._queries.find((q) => q._mask === mask);

    if (!query) {
      query = new Query(this, mask, Components);
      this._queries.push(query);
    }

    if (!query._check(Components)) {
      return new Query(this, mask, Components, query);
    }

    return query;
  }

  /**
   * Sequentially runs the `update` method of each system from the `pipeline` array of systems, passing the specified parameters to it. At the same time, the update of the world can be performed without using this method by manually calling the necessary systems. Here is an example that starts the systems on its own and collects information about the execution time of each of them.:
   *
   * ```javascript
   * const pipeline = [new TargetingSystem(ecs), new MovementSystem(ecs)];
   *
   * let last = performance.now();
   *
   * const loop = () => {
   *     const now = performance.now();
   *     const delta = now - last;
   *     last = now;
   *
   *     // Launching systems "out of the box"
   *     // world.update(pipeline, delta);
   *
   *     // Starting the systems manually
   *     const statistics = {};
   *
   *     pipeline.forEach((system) => {
   *         const begin = performance.now();
   *         system.update(delta);
   *         statistics[system.constructor.name] = performance.now() - begin;
   *     });
   *
   *     console.log(statistics);
   *
   *     requestAnimationFrame(loop);
   * };
   *
   * requestAnimationFrame(loop);
   * ```
   *
   * Any class or object with the `update` method can act as a system, the parameters of which are not regulated by the library and are determined by the developer himself when calling `world.update`. This allows you to flexibly customize the behavior of the library depending on the needs of the application. As a rule, this method accepts only one `delta` argument, which determines how much time has passed since the last update.
   */
  update(pipeline: System[], ...args: any[]) {
    pipeline.forEach((system) => system.update(...args));
  }

  /**
   * Removes all entities and their components from the world.
   */
  reset() {
    this._entities.forEach((entity) => entity.delete());
  }
}

/**
 * Registers JavaScript classes for use as components. Classes can be registered either by a single call with multiple arguments, or by separate calls. Re-registration of an already registered class will not result in an error - in this case, nothing will be done.
 *
 * There are no restrictions on the number of registered classes. There are no requirements for classes, they can contain any data and have any methods. If the class contains the `destructor` method, it will be called when deleting a component from an entity (including when deleting the entity itself) and will receive a reference to the entity as an argument.
 */
const registerComponents = (...Components: RawComponent[]) => {
  Components.forEach((Component) => {
    if (!components.has(Component)) {
      (Component as RegisteredComponent<any>)[ecsComponentMask] = BigInt(
        "0b1".padEnd(3 + bit++, "0"),
      );
      components.add(Component);
    }
  });
};

/**
 * Creates a world - a separate container for simulation. There can be any number of worlds independent of each other at the same time. The world is the root element of ECS, with its help entities are created and an update is launched.
 */
const createWorld = () => new World();

export default { registerComponents, createWorld };
