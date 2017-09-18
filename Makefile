.PHONY: all clean lint check test coverage docs

all:
	yarn install

clean:
	rm -rf node_modules/*
	rm -rf coverage

lint:
	yarn run lint

check:
	yarn test

test: check

coverage:
	yarn run coverage

docs:
	docco ./*.js
