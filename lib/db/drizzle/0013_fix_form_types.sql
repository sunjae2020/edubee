-- Fix incorrect form_type values in application_forms tables
-- These forms were created before new form types were added and defaulted to lead_inquiry

-- Update all tenant schemas dynamically
DO $$
DECLARE
  schema_name TEXT;
BEGIN
  FOR schema_name IN
    SELECT nspname FROM pg_namespace
    WHERE nspname NOT IN ('public','information_schema','pg_catalog','pg_toast','extensions','realtime','storage','auth','graphql','graphql_public','supabase_functions','supabase_migrations','_realtime')
      AND nspname NOT LIKE 'pg_%'
  LOOP
    BEGIN
      EXECUTE format(
        $fmt$
          UPDATE %I.application_forms
          SET form_type = 'service_application'
          WHERE slug IN ('service-program-application')
            AND form_type = 'lead_inquiry';

          UPDATE %I.application_forms
          SET form_type = 'schooling_consultation'
          WHERE slug IN ('schooling-consultation-form')
            AND form_type = 'lead_inquiry';

          UPDATE %I.application_forms
          SET form_type = 'study_abroad_consultation'
          WHERE slug LIKE '%study-abroad%consultation%'
            AND form_type = 'lead_inquiry';

          UPDATE %I.application_forms
          SET form_type = 'general_consultation'
          WHERE slug LIKE '%general%consultation%'
            AND form_type = 'lead_inquiry';
        $fmt$,
        schema_name, schema_name, schema_name, schema_name
      );
    EXCEPTION WHEN OTHERS THEN
      -- Table may not exist in this schema, skip
      NULL;
    END;
  END LOOP;
END $$;
