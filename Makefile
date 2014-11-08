
MOCHA_OPTS= --check-leaks --timeout 30000
REPORTER = spec

test: test-integration-all

test-clean: test-integration-all clean


test-integration-all: test-integration-orientdb test-integration

test-integration:
	@echo "\n\nNOTICE: If tests fail, please ensure you've set the correct credentials in lib/adapter.js\n"
	@echo "Running generic adapter integration tests..."
	@NODE_ENV=test node test/integration/runner.js

test-integration-orientdb:
	@echo "\n\nNOTICE: If tests fail, please ensure you've set the correct credentials in lib/adapter.js\n"
	@echo "Running waterline-orientdb integration tests..."
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--timeout 30000 --globals Associations \
		test/integration-orientdb/tests/**/*.js

test-unit:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		$(MOCHA_OPTS) \
		test/unit/**/*.js

test-load:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		$(MOCHA_OPTS) \
		test/load/**

clean:
	@echo "\n\nDROPPING ALL COLLECTIONS from default db: waterline"
	./node_modules/.bin/oriento db drop waterline
