type Constructor<T> = new (...args: any[]) => T;

interface Entity {
  id?: string; // todo: use a unique symbol (similar to ecs library)

  constructor: Function;
  update: (...args: any[]) => void;
  draw: (...args: any[]) => void;
}

export abstract class EntityManager<T extends Entity> {
  protected entities = new Map<string, T>();
  protected newFunc: Constructor<T>;

  constructor(newFunc: Constructor<T>) {
    this.newFunc = newFunc;
  }

  public get list() {
    return [...this.entities.values()];
  }

  public get count() {
    return this.entities.size;
  }

  public clearEntities() {
    this.entities.clear();
  }

  public delete(t: T) {
    this.entities.delete(t.id!);
  }

  protected add(t: T) {
    t.id ||= crypto.randomUUID();
    this.entities.set(t.id, t);
  }

  /** Dispenses a new entity */
  public spawn(...args: ConstructorParameters<typeof this.newFunc>) {
    const e = new this.newFunc(...args);
    this.add(e);
    return e;
  }

  public update() {
    this.list.forEach((h) => {
      h.update();
      h.draw();
    });
  }
}
