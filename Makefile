all:
	npm install

clean:
	rm -rf node_modules/*
	rm -rf coverage

check:
	npm test

test: check

coverage:
	npm run coverage

docs:
	docco ./*.js
