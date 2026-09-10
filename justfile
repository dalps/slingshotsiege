default:
    npm run dev

build:
    npx vite build

microbundle: build minify-html
    microbundle -i dist/assets/*.js

minify-html:
    mkdir -p dist
    html-minifier --collapse-whitespace --remove-comments --remove-optional-tags --remove-redundant-attributes --remove-script-type-attributes --remove-tag-whitespace --use-short-doctype --minify-css true --minify-js true dist/index.html -o dist/index.html

copy-assets:
    cp ~/desktop/unicorns-rainbows/assets.svg public/

zip: build
    mkdir -p tmp
    # roadroller dist/assets/*.js -o tmp/main.js
    advzip pack.zip -a dist/assets/*.js dist/index.html
    stat pack.zip

# google-closure-compiler --js=dist/assets/index-COg8mwMQ.js -W QUIET -O ADVANCED --js_output_file=tmp/main.js
