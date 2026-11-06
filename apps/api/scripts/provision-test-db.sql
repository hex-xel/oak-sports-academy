-- Owner runs ONLY inside the disposable local oak-auth-tests container, after migrations.
-- Fixed synthetic credentials are local test fixtures, never deployment credentials.
BEGIN;
DO $guard$
BEGIN
  IF current_database() <> 'oak_auth_test' THEN
    RAISE EXCEPTION 'Refusing non-test database';
  END IF;
END
$guard$;
CREATE ROLE oak_api_test LOGIN PASSWORD 'oak_test_only_runtime'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT oak_runtime TO oak_api_test;
CREATE SCHEMA oak_test_control;
REVOKE ALL ON SCHEMA oak_test_control FROM PUBLIC;
CREATE TABLE oak_test_control.marker (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  name TEXT NOT NULL CHECK (name = 'oak_auth_test_v1')
);
INSERT INTO oak_test_control.marker (name) VALUES ('oak_auth_test_v1');
REVOKE ALL ON oak_test_control.marker FROM PUBLIC;
COMMIT;
