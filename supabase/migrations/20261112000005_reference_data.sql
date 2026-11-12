-- =============================================================================
-- SwaData AI — reference data required in every environment
-- (No personal data. No synthetic contributions — see supabase/seed.sql for
--  clearly-labelled synthetic development data.)
-- =============================================================================

insert into public.roles (key, name, description, rank) values
  ('contributor', 'Contributor', 'Submits language data: text, audio, documents, translations, conversations and cultural knowledge.', 10),
  ('translator', 'Translator', 'Contributes and refines translations between African languages and English.', 20),
  ('reviewer', 'Reviewer', 'Validates submissions for accuracy, quality and appropriateness.', 30),
  ('linguist', 'Linguist', 'Senior reviewer: assigns reviews, verifies rights, handles culturally restricted material and final decisions.', 40),
  ('researcher', 'Researcher', 'Searches, requests and downloads permitted datasets for research.', 35),
  ('admin', 'Administrator', 'Manages users, languages, datasets, releases and platform governance.', 50),
  ('super_admin', 'Super Administrator', 'Full control including administrator role management.', 60)
on conflict (key) do nothing;

-- BCP-47 codes (ISO 639-1 where it exists, otherwise ISO 639-3) and ISO 639-3.
insert into public.languages (code, iso639_3, name, native_name, family, region, countries, is_official_za, is_priority, is_active, sort_order, description) values
  ('ss',  'ssw', 'siSwati',    'siSwati',    'Niger-Congo › Bantu › Nguni',        'Southern Africa', '{SZ,ZA}', true, true, true, 1,
   'Official language of Eswatini and one of South Africa''s official languages, spoken mainly in Mpumalanga. SwaData AI''s founding priority language.'),
  ('zu',  'zul', 'isiZulu',    'isiZulu',    'Niger-Congo › Bantu › Nguni',        'Southern Africa', '{ZA}', true, false, true, 2,
   'The most widely spoken home language in South Africa, concentrated in KwaZulu-Natal and Gauteng.'),
  ('xh',  'xho', 'isiXhosa',   'isiXhosa',   'Niger-Congo › Bantu › Nguni',        'Southern Africa', '{ZA}', true, false, true, 3,
   'Spoken widely in the Eastern and Western Cape; known for its click consonants.'),
  ('nr',  'nbl', 'isiNdebele', 'isiNdebele', 'Niger-Congo › Bantu › Nguni',        'Southern Africa', '{ZA}', true, false, true, 4,
   'South African (Southern) isiNdebele, spoken mainly in Mpumalanga, Gauteng and Limpopo.'),
  ('st',  'sot', 'Sesotho',    'Sesotho',    'Niger-Congo › Bantu › Sotho-Tswana', 'Southern Africa', '{ZA,LS}', true, false, true, 5,
   'Official language of Lesotho and South Africa, spoken widely in the Free State and Gauteng.'),
  ('tn',  'tsn', 'Setswana',   'Setswana',   'Niger-Congo › Bantu › Sotho-Tswana', 'Southern Africa', '{ZA,BW}', true, false, true, 6,
   'National language of Botswana and an official language of South Africa, spoken widely in North West province.'),
  ('nso', 'nso', 'Sepedi',     'Sepedi',     'Niger-Congo › Bantu › Sotho-Tswana', 'Southern Africa', '{ZA}', true, false, true, 7,
   'Also known as Sesotho sa Leboa (Northern Sotho), spoken mainly in Limpopo and Gauteng.'),
  ('ve',  'ven', 'Tshivenda',  'Tshivenḓa',  'Niger-Congo › Bantu › Venda',        'Southern Africa', '{ZA,ZW}', true, false, true, 8,
   'Spoken mainly in Limpopo province of South Africa and in southern Zimbabwe.'),
  ('ts',  'tso', 'Xitsonga',   'Xitsonga',   'Niger-Congo › Bantu › Tswa-Ronga',   'Southern Africa', '{ZA,MZ,ZW,SZ}', true, false, true, 9,
   'Spoken in Limpopo and Mpumalanga, and across southern Mozambique.'),
  ('af',  'afr', 'Afrikaans',  'Afrikaans',  'Indo-European › Germanic',            'Southern Africa', '{ZA,NA}', true, false, true, 10,
   'A West Germanic language developed in Southern Africa, spoken across South Africa and Namibia.'),
  ('en',  'eng', 'English',    'English',    'Indo-European › Germanic',            'Global',          '{ZA}', true, false, true, 11,
   'An official South African language and the platform''s default pivot language for translation.'),
  -- Expandable African language registry (inactive until an administrator activates them)
  ('sw',  'swa', 'Kiswahili',  'Kiswahili',  'Niger-Congo › Bantu',                 'East Africa',     '{TZ,KE,UG,CD}', false, false, false, 20, ''),
  ('yo',  'yor', 'Yoruba',     'Èdè Yorùbá', 'Niger-Congo › Volta-Niger',           'West Africa',     '{NG,BJ}', false, false, false, 21, ''),
  ('ig',  'ibo', 'Igbo',       'Asụsụ Igbo', 'Niger-Congo › Volta-Niger',           'West Africa',     '{NG}', false, false, false, 22, ''),
  ('ha',  'hau', 'Hausa',      'Harshen Hausa', 'Afro-Asiatic › Chadic',            'West Africa',     '{NG,NE}', false, false, false, 23, ''),
  ('am',  'amh', 'Amharic',    'አማርኛ',       'Afro-Asiatic › Semitic',              'East Africa',     '{ET}', false, false, false, 24, ''),
  ('sn',  'sna', 'chiShona',   'chiShona',   'Niger-Congo › Bantu',                 'Southern Africa', '{ZW}', false, false, false, 25, ''),
  ('nd',  'nde', 'Northern Ndebele', 'isiNdebele (Zimbabwe)', 'Niger-Congo › Bantu › Nguni', 'Southern Africa', '{ZW}', false, false, false, 26, ''),
  ('rw',  'kin', 'Kinyarwanda', 'Ikinyarwanda', 'Niger-Congo › Bantu',              'East Africa',     '{RW}', false, false, false, 27, ''),
  ('rn',  'run', 'Kirundi',    'Ikirundi',   'Niger-Congo › Bantu',                 'East Africa',     '{BI}', false, false, false, 28, ''),
  ('so',  'som', 'Somali',     'Af-Soomaali', 'Afro-Asiatic › Cushitic',            'East Africa',     '{SO,ET,DJ,KE}', false, false, false, 29, ''),
  ('om',  'orm', 'Oromo',      'Afaan Oromoo', 'Afro-Asiatic › Cushitic',           'East Africa',     '{ET,KE}', false, false, false, 30, ''),
  ('ti',  'tir', 'Tigrinya',   'ትግርኛ',       'Afro-Asiatic › Semitic',              'East Africa',     '{ER,ET}', false, false, false, 31, ''),
  ('ny',  'nya', 'Chichewa',   'Chichewa',   'Niger-Congo › Bantu',                 'Southern Africa', '{MW,ZM,MZ}', false, false, false, 32, ''),
  ('ln',  'lin', 'Lingala',    'Lingála',    'Niger-Congo › Bantu',                 'Central Africa',  '{CD,CG}', false, false, false, 33, ''),
  ('lg',  'lug', 'Luganda',    'Oluganda',   'Niger-Congo › Bantu',                 'East Africa',     '{UG}', false, false, false, 34, ''),
  ('ki',  'kik', 'Gikuyu',     'Gĩkũyũ',     'Niger-Congo › Bantu',                 'East Africa',     '{KE}', false, false, false, 35, ''),
  ('wo',  'wol', 'Wolof',      'Wolof',      'Niger-Congo › Atlantic',              'West Africa',     '{SN,GM}', false, false, false, 36, ''),
  ('ak',  'aka', 'Akan',       'Akan',       'Niger-Congo › Kwa',                   'West Africa',     '{GH}', false, false, false, 37, ''),
  ('ff',  'ful', 'Fula',       'Fulfulde',   'Niger-Congo › Atlantic',              'West Africa',     '{SN,GN,NG,CM}', false, false, false, 38, ''),
  ('mg',  'mlg', 'Malagasy',   'Malagasy',   'Austronesian',                        'Indian Ocean',    '{MG}', false, false, false, 39, ''),
  ('loz', 'loz', 'Silozi',     'Silozi',     'Niger-Congo › Bantu › Sotho-Tswana',  'Southern Africa', '{ZM,NA}', false, false, false, 40, ''),
  ('ng',  'ndo', 'Oshiwambo (Ndonga)', 'Oshindonga', 'Niger-Congo › Bantu',         'Southern Africa', '{NA}', false, false, false, 41, ''),
  ('naq', 'naq', 'Khoekhoe',   'Khoekhoegowab', 'Khoe-Kwadi',                       'Southern Africa', '{NA,ZA}', false, false, false, 42, '')
on conflict (code) do nothing;

update public.languages set script = 'Ethi' where code in ('am', 'ti');

-- Country-level varieties only; finer dialect varieties should be added by linguists.
insert into public.language_varieties (language_id, code, name, region, description)
select l.id, v.code, v.name, v.region, v.description
from (values
  ('ss', 'ss-SZ', 'siSwati (Eswatini)', 'Eswatini', 'siSwati as spoken in Eswatini.'),
  ('ss', 'ss-ZA', 'siSwati (South Africa)', 'Mpumalanga, South Africa', 'siSwati as spoken in South Africa, mainly Mpumalanga.'),
  ('st', 'st-ZA', 'Sesotho (South Africa)', 'South Africa', ''),
  ('st', 'st-LS', 'Sesotho (Lesotho)', 'Lesotho', ''),
  ('tn', 'tn-ZA', 'Setswana (South Africa)', 'South Africa', ''),
  ('tn', 'tn-BW', 'Setswana (Botswana)', 'Botswana', ''),
  ('ts', 'ts-ZA', 'Xitsonga (South Africa)', 'South Africa', ''),
  ('ts', 'ts-MZ', 'Xichangana (Mozambique)', 'Mozambique', ''),
  ('af', 'af-ZA', 'Afrikaans (South Africa)', 'South Africa', ''),
  ('af', 'af-NA', 'Afrikaans (Namibia)', 'Namibia', ''),
  ('en', 'en-ZA', 'South African English', 'South Africa', '')
) as v(lang, code, name, region, description)
join public.languages l on l.code = v.lang
on conflict (language_id, code) do nothing;

insert into public.content_categories (key, name, description, applies_to, sort_order) values
  ('sentence', 'Individual sentences', 'Single natural sentences.', '{text}', 1),
  ('paragraph', 'Paragraphs', 'Connected passages of a few sentences.', '{text}', 2),
  ('long_form', 'Long-form text', 'Essays, reports and extended writing.', '{text,document}', 3),
  ('everyday_expression', 'Everyday expressions', 'Common phrases used in daily life.', '{text,audio,translation}', 4),
  ('question_answer', 'Questions and answers', 'Question and answer pairs.', '{text,conversation}', 5),
  ('educational', 'Educational material', 'Teaching and learning content.', '{text,document,conversation,audio}', 6),
  ('story', 'Stories', 'Narratives and short stories.', '{text,document,audio}', 7),
  ('technical_terminology', 'Technical terminology', 'Terms for science, technology, health, law and more.', '{text,translation}', 8),
  ('poetry', 'Poems and literature', 'Poetry, praise poetry and literary works.', '{text,document,audio}', 9),
  ('news', 'News and current affairs', 'Factual reporting.', '{text,document,translation}', 10),
  ('read_speech', 'Read speech', 'A speaker reading a provided prompt aloud.', '{audio}', 11),
  ('spontaneous_speech', 'Spontaneous speech', 'Natural, unscripted speech.', '{audio}', 12),
  ('dictionary', 'Dictionaries and word lists', 'Lexicographic material.', '{document}', 13),
  ('health', 'Health', 'Health and wellbeing content.', '{text,translation,conversation}', 14),
  ('agriculture', 'Agriculture', 'Farming and food systems.', '{text,translation,conversation}', 15),
  ('government', 'Government and civic', 'Civic information and public services.', '{text,document,translation}', 16)
on conflict (key) do nothing;

insert into public.data_licenses (code, name, url, allows_commercial, requires_attribution, share_alike, description) values
  ('CC-BY-4.0', 'Creative Commons Attribution 4.0', 'https://creativecommons.org/licenses/by/4.0/', true, true, false, 'Reuse for any purpose with attribution.'),
  ('CC-BY-SA-4.0', 'Creative Commons Attribution-ShareAlike 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', true, true, true, 'Reuse with attribution; derivatives under the same licence.'),
  ('CC-BY-NC-4.0', 'Creative Commons Attribution-NonCommercial 4.0', 'https://creativecommons.org/licenses/by-nc/4.0/', false, true, false, 'Non-commercial reuse with attribution.'),
  ('CC0-1.0', 'Creative Commons Zero 1.0 (Public Domain Dedication)', 'https://creativecommons.org/publicdomain/zero/1.0/', true, false, false, 'No rights reserved.'),
  ('SWADATA-RESEARCH-1.0', 'SwaData Community Research Licence 1.0', null, false, true, false, 'Non-commercial research and AI model development only, with attribution to SwaData AI contributors. Redistribution of raw data not permitted.'),
  ('PERMISSION-GRANTED', 'All rights reserved — written permission granted', null, false, true, false, 'Copyrighted material used under explicit written permission from the rights holder. Not for public redistribution.')
on conflict (code) do nothing;

insert into public.datasets (slug, name, summary, dataset_type, access_level, license_id, intended_use, limitations, processing_methodology, is_benchmark)
select v.slug, v.name, v.summary, v.dtype::public.dataset_type, v.access::public.access_level, l.id, v.intended, v.limitations,
  'Collected through SwaData AI with per-item consent. Only contributions approved by at least one reviewer, with permission for AI training and research, are included. Unicode NFC normalisation and whitespace normalisation only; no automatic spelling or grammar correction. Exact duplicates are removed by normalised hash. Splits are contributor-aware (all items from one contributor fall in one split) and duplicate-aware.',
  v.bench
from (values
  ('swadata-monolingual-text', 'SwaData Monolingual Text', 'Validated monolingual sentences, paragraphs and approved document extracts.', 'monolingual_text', 'registered', 'SWADATA-RESEARCH-1.0',
   'Language modelling, tokenizer training and SLM pre-training for African languages.', 'Coverage varies by language and domain. Not representative of all dialects.', false),
  ('swadata-parallel-translations', 'SwaData Parallel Translations', 'Human translations between African languages and English, reviewed for accuracy and fluency.', 'parallel_text', 'registered', 'SWADATA-RESEARCH-1.0',
   'Machine translation training and evaluation.', 'Translations reflect individual translators; multiple valid translations may exist.', false),
  ('swadata-conversations', 'SwaData Conversations', 'Structured multi-turn dialogues with speaker roles.', 'conversation', 'registered', 'SWADATA-RESEARCH-1.0',
   'Conversational AI and dialogue modelling.', 'Dialogues are contributor-authored and may be scripted.', false),
  ('swadata-instructions', 'SwaData Instruction Tuning', 'Instruction/response pairs derived from approved question-answer conversations.', 'instruction', 'restricted', 'SWADATA-RESEARCH-1.0',
   'Instruction tuning of small language models.', 'Derived automatically from conversations; review before use.', false),
  ('swadata-cultural', 'SwaData Cultural Language Data', 'Proverbs, idioms, greetings and oral traditions with meanings and context.', 'cultural', 'restricted', 'SWADATA-RESEARCH-1.0',
   'Culturally grounded evaluation and preservation research.', 'Restricted-sensitivity items are always excluded.', false),
  ('swadata-speech', 'SwaData Speech & Transcription', 'Consented speech recordings with reviewed transcripts and pseudonymous speaker metadata.', 'speech', 'restricted', 'SWADATA-RESEARCH-1.0',
   'Automatic speech recognition and text-to-speech research.', 'Speaker demographics are self-reported and optional.', false),
  ('swadata-mt-benchmark', 'SwaData Translation Benchmark', 'Held-out evaluation set of reviewed translations for benchmarking models.', 'parallel_text', 'registered', 'SWADATA-RESEARCH-1.0',
   'Evaluation only — must not be used for training.', 'Small; intended for comparative evaluation.', true)
) as v(slug, name, summary, dtype, access, lic, intended, limitations, bench)
left join public.data_licenses l on l.code = v.lic
on conflict (slug) do nothing;

insert into public.system_settings (key, value, description, is_public) values
  ('max_contributions_per_hour', '120', 'Per-user submission limit.', false),
  ('max_upload_mb', '50', 'Maximum upload size in megabytes.', true),
  ('policy_version', '"2026-11"', 'Current privacy/terms policy version.', true),
  ('transcription_enabled', 'false', 'Whether automatic transcription is offered (requires the processing service with Whisper).', true),
  ('retention_rejected_days', '365', 'Days to keep rejected contributions before purge review.', false),
  ('registration_open', 'true', 'Whether new registrations are accepted.', true)
on conflict (key) do nothing;

-- English prompts contributors can translate (source text only; no machine translations).
insert into public.translation_sources (language_id, text, domain)
select l.id, s.text, s.domain from public.languages l,
(values
  ('Good morning. How did you sleep?', 'everyday'),
  ('Please wash your hands before eating.', 'health'),
  ('The clinic opens at eight o''clock in the morning.', 'health'),
  ('Where is the nearest school?', 'everyday'),
  ('We planted maize after the first rains.', 'agriculture'),
  ('My grandmother tells us stories every evening.', 'culture'),
  ('How much does a taxi to town cost?', 'everyday'),
  ('Remember to drink clean water every day.', 'health'),
  ('The meeting has been moved to Thursday afternoon.', 'everyday'),
  ('Children should go to school every day.', 'education'),
  ('Please speak slowly so that I can understand.', 'everyday'),
  ('The river is full after the storm.', 'everyday')
) as s(text, domain)
where l.code = 'en';
