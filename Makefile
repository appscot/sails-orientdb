
MOCHA_OPTS= --check-leaks --timeout 30000
REPORTER = spec

test: test-integration

test-clean: test-integration clean

test-integration:
	echo "\n\nNOTICE: If tests fail, please ensure you've set the correct credentials in lib/adapter.js\n\n"
	echo "Running integration tests..."
	@NODE_ENV=test node test/integration/runner.js

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
	echo 'DROPPING ALL COLLECTIONS from default db waterline'
	./node_modules/.bin/oriento db drop waterline
