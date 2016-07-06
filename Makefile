
MOCHA_OPTS= --check-leaks --timeout 6000
REPORTER = spec
DB?=waterline-test-integration

test: clean-all test-unit test-integration-all
test-all: test test-integration-schemaless clean test-integration-documentdb


test-integration-all: test-integration-orientdb test-integration


test-integration-generic:
	@echo "\n\nNOTICE: If tests fail, please ensure you've set the correct credentials in test/test-connection.json\n"
	@echo "Running 'waterline-adapter-tests' integration tests..."
	
test-integration: test-integration-generic
	@NODE_ENV=test node test/integration/runner.js
	
test-integration-documentdb: test-integration-generic
	@echo DATABASE_TYPE=document
	@NODE_ENV=test DATABASE_TYPE=document node test/integration/runner.js
	
test-integration-schemaless: test-integration-generic
	@echo SCHEMA=0
	@NODE_ENV=test SCHEMA=0 node test/integration/runner.js

test-integration-orientdb:
	@echo "\n\nNOTICE: If tests fail, please ensure you've set the correct credentials in test/test-connection.json\n"
	@echo "Running waterline-orientdb integration tests..."
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--timeout 6000 --globals Associations,CREATE_TEST_WATERLINE,DELETE_TEST_WATERLINE \
		test/integration-orientdb/*.js test/integration-orientdb/tests/**/*.js \
		test/integration-orientdb/bugs/*.js test/integration-orientdb/bugs/**/*.js

test-unit:
	@echo "\n\nRunning waterline-orientdb unit tests..."
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		$(MOCHA_OPTS) \
		test/unit/*.js test/unit/**/*.js
		
coverage: clean-all
	@echo "\n\nRunning coverage report..."
	rm -rf coverage
	./node_modules/istanbul/lib/cli.js cover --report none --dir coverage/unit \
		./node_modules/.bin/_mocha test/unit/*.js test/unit/**/*.js \
		-- $(MOCHA_OPTS)
	./node_modules/istanbul/lib/cli.js cover --report none --dir coverage/integration-orientdb \
		./node_modules/.bin/_mocha test/integration-orientdb/*.js test/integration-orientdb/tests/**/*.js \
		-- --timeout 15000 --globals Associations
	./node_modules/istanbul/lib/cli.js cover --report none --dir coverage/integration test/integration/runner.js
	./node_modules/istanbul/lib/cli.js cover --report none --dir coverage/integration-document test/integration/runner.js document
	./node_modules/istanbul/lib/cli.js report

clean:
	@echo "\n\nDROPPING ALL COLLECTIONS from db: $(DB)"
	@echo "NOTICE: If operation fails, please ensure you've set the correct credentials in orientjs.opts file"
	@echo "Note: you can choose which db to drop by appending 'DB=<db_name>', e.g. 'make clean DB=waterline-test-orientdb'\n"
	./node_modules/.bin/orientjs db drop $(DB) || true
	
clean-all:
	@echo "\n\nDROPPING DATABASES: waterline-test-integration, waterline-test-orientdb"
	@echo "NOTICE: If operation fails, please ensure you've set the correct credentials in orientjs.opts file\n"
	./node_modules/.bin/orientjs db drop waterline-test-integration > /dev/null 2>&1 || true
	./node_modules/.bin/orientjs db drop waterline-test-orientdb > /dev/null 2>&1 || true
	@echo "Done"

.PHONY: coverage
