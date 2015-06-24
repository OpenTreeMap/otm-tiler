.PHONY: all clean lint check test coverage docs

all:
	npm install

clean:
	rm -rf node_modules/*
	rm -rf coverage

lint:
	npm run lint

check:
	npm test

test: check

coverage:
	npm run coverage

docs:
	docco ./*.js
