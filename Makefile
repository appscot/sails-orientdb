
MOCHA_OPTS= --check-leaks --timeout 10000
REPORTER = spec

test: test-unit test-integration-all

test-clean: test-unit test-integration-all clean


test-integration-all: test-integration-orientdb test-integration

test-integration:
	@echo "\n\nNOTICE: If tests fail, please ensure you've set the correct credentials in lib/adapter.js\n"
	@echo "Running 'waterline-adapter-tests' integration tests..."
	@NODE_ENV=test node test/integration/runner.js

test-integration-orientdb:
	@echo "\n\nNOTICE: If tests fail, please ensure you've set the correct credentials in lib/adapter.js\n"
	@echo "Running waterline-orientdb integration tests..."
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--timeout 5000 --globals Associations \
		test/integration-orientdb/*.js test/integration-orientdb/tests/**/*.js

test-unit:
	@echo "\n\nRunning waterline-orientdb unit tests..."
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		$(MOCHA_OPTS) \
		test/unit/*.js test/unit/**/*.js

test-load:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		$(MOCHA_OPTS) \
		test/load/**

clean:
	@echo "\n\nDROPPING ALL COLLECTIONS from default db: waterline"
	./node_modules/.bin/oriento db drop waterline
