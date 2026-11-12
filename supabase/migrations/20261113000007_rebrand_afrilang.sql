-- =============================================================================
-- Rebrand: SwaData AI -> AfriLang Research
-- Updates user-visible reference data. Identifiers used by the application
-- (table names, roles, settings keys) are unchanged.
-- =============================================================================

update public.data_licenses
   set code = 'AFRILANG-RESEARCH-1.0',
       name = 'AfriLang Community Research Licence 1.0',
       description = replace(description, 'SwaData AI', 'AfriLang Research')
 where code = 'SWADATA-RESEARCH-1.0';

update public.data_licenses
   set description = replace(description, 'SwaData AI', 'AfriLang Research')
 where description like '%SwaData%';

update public.datasets
   set slug = regexp_replace(slug, '^swadata-', 'afrilang-'),
       name = replace(name, 'SwaData', 'AfriLang'),
       summary = replace(replace(summary, 'SwaData AI', 'AfriLang Research'), 'SwaData', 'AfriLang'),
       description = replace(replace(description, 'SwaData AI', 'AfriLang Research'), 'SwaData', 'AfriLang'),
       intended_use = replace(replace(intended_use, 'SwaData AI', 'AfriLang Research'), 'SwaData', 'AfriLang'),
       limitations = replace(replace(limitations, 'SwaData AI', 'AfriLang Research'), 'SwaData', 'AfriLang'),
       processing_methodology = replace(replace(processing_methodology, 'SwaData AI', 'AfriLang Research'), 'SwaData', 'AfriLang')
 where slug like 'swadata-%'
    or name like '%SwaData%'
    or processing_methodology like '%SwaData%';

update public.languages
   set description = replace(description, 'SwaData AI', 'AfriLang Research')
 where description like '%SwaData%';

-- Provenance text inside any existing releases.
update public.dataset_releases
   set provenance = replace(replace(provenance::text, 'SwaData AI', 'AfriLang Research'), 'swadata-builder', 'afrilang-builder')::jsonb
 where provenance::text like '%SwaData%' or provenance::text like '%swadata-builder%';
