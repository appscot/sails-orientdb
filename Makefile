
MOCHA_OPTS= --check-leaks --timeout 6000
REPORTER = spec
DB?=waterline-test-integration

test: test-unit test-integration-all

test-clean: test-unit test-integration-all clean


test-integration-all: test-integration-orientdb test-integration

test-integration:
	@echo "\n\nNOTICE: If tests fail, please ensure you've set the correct credentials in test/test-connection.json\n"
	@echo "Running 'waterline-adapter-tests' integration tests..."
	@NODE_ENV=test node test/integration/runner.js

test-integration-orientdb:
	@echo "\n\nNOTICE: If tests fail, please ensure you've set the correct credentials in test/test-connection.json\n"
	@echo "Running waterline-orientdb integration tests..."
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--timeout 15000 --globals Associations,Bugs \
		test/integration-orientdb/*.js test/integration-orientdb/tests/**/*.js \
		test/integration-orientdb/bugs/*.js test/integration-orientdb/bugs/**/*.js

test-unit:
	@echo "\n\nRunning waterline-orientdb unit tests..."
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		$(MOCHA_OPTS) \
		test/unit/*.js test/unit/**/*.js
		
coverage:
	@echo "\n\nRunning coverage report..."
	rm -rf coverage
	./node_modules/istanbul/lib/cli.js cover --report none --dir coverage/unit \
		./node_modules/.bin/_mocha test/unit/*.js test/unit/**/*.js \
		-- $(MOCHA_OPTS)
	./node_modules/istanbul/lib/cli.js cover --report none --dir coverage/integration-orientdb \
		./node_modules/.bin/_mocha test/integration-orientdb/*.js test/integration-orientdb/tests/**/*.js \
		-- --timeout 15000 --globals Associations
	./node_modules/istanbul/lib/cli.js cover --report none --dir coverage/integration test/integration/runner.js
	./node_modules/istanbul/lib/cli.js report

clean:
	@echo "\n\nDROPPING ALL COLLECTIONS from db: $(DB)"
	@echo "NOTICE: If operation fails, please ensure you've set the correct credentials in oriento.opts file\n"
	./node_modules/.bin/oriento db drop $(DB)

.PHONY: coverage
