--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: accommodation_mgt; Type: TABLE DATA; Schema: myagency; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE myagency.accommodation_mgt DISABLE TRIGGER ALL;

COPY myagency.accommodation_mgt (id, contract_id, lead_id, student_account_id, assigned_staff_id, provider_account_id, accommodation_type, checkin_date, checkout_date, meal_included, room_type, weekly_rate, partner_weekly_cost, host_name, host_address, host_contact, distance_to_school, welfare_check_dates, relocation_reason, settlement_id, status, notes, created_at, updated_at, is_active, booking_confirmation_no, room_number, per_night_rate, sub_total, other_fee, total_hotel_fee, payment_date) FROM stdin;
2ec52a5e-7820-4a6b-b5a0-b927931de449	a89cbc95-af8a-42b5-b5af-7dcc28e764c6	\N	\N	\N	\N	hotel	2026-07-18	2026-08-08	\N	1 Bedroom - Twin Beds	\N	\N	Brady Hotel Hardware	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:45:30.764574	2026-04-11 11:45:30.764574	t	\N	\N	\N	\N	\N	\N	\N
b2b2cc85-bb54-47f4-b986-879366526ffc	d76bea55-68fa-4a62-a537-a94a16902391	\N	\N	\N	\N	hotel	2026-07-18	2026-08-08	\N	2 Bedroms	\N	\N	Brady Hotel Hardware	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:45:34.510059	2026-04-11 11:45:34.510059	t	\N	\N	\N	\N	\N	\N	\N
5a8630bd-786b-47db-aa3b-9dfb434727e0	3c7871d3-6722-446b-bcc6-39722b7e443d	\N	\N	\N	\N	hotel	2026-06-12	2026-08-08	\N	2 Bedroms - Connected	\N	\N	Punthill Oakleigh	\N	\N	\N	\N	\N	\N	applied	\N	2026-04-11 11:45:38.107306	2026-04-11 11:45:38.107306	t	Guest contact to branch directly.	\N	\N	\N	\N	\N	\N
7ac64d71-d25f-405c-8dd2-a1d7b099a5af	a82d9619-f105-405d-a1c7-5d51c4b1dcfc	\N	\N	\N	\N	hotel	2026-07-18	2026-08-08	\N	1 Bedroom - Twin Beds	\N	\N	Brady Hotel Hardware	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:45:41.760916	2026-04-11 11:45:41.760916	t	\N	\N	\N	\N	\N	\N	\N
c494801f-20c5-44a1-bfdb-3848c8b06c3e	6d77ec2e-2080-422e-a36f-3235fc1b20db	\N	\N	\N	\N	hotel	2026-07-18	2026-08-08	\N	2 Bedroms - Connected	\N	\N	Punthill Oakleigh	\N	\N	\N	\N	\N	\N	applied	\N	2026-04-11 11:45:45.429619	2026-04-11 11:45:45.429619	t	Can be changed	\N	\N	\N	\N	\N	\N
92d45d0e-4b15-484b-9e9a-919a192954b8	af574d96-22a4-40ac-80e6-38eb769abcc9	\N	\N	\N	\N	hotel	2026-07-18	2026-08-08	\N	1 Bedroom - Twin Beds	\N	\N	Punthill Oakleigh	\N	\N	\N	\N	\N	\N	applied	\N	2026-04-11 11:45:49.006354	2026-04-11 11:45:49.006354	t	Can be changed	\N	\N	\N	\N	\N	\N
60fc7d3d-ffbd-43d2-a956-2d59bb2e40ba	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	\N	\N	\N	hotel	2026-07-18	2026-08-08	\N	2 Bedroms	\N	\N	Brady Hotel Hardware	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:45:52.667946	2026-04-11 11:45:52.667946	t	\N	\N	\N	\N	\N	\N	\N
93dc076b-74ab-45ed-ad79-6190bc77bc13	c2cf71a6-8877-40f1-8685-16c7fd32e805	\N	\N	\N	\N	hotel	2026-07-18	2026-08-08	\N	1 Bedroom - Twin Beds	\N	\N	Brady Hotel Hardware	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:45:56.301898	2026-04-11 11:45:56.301898	t	\N	\N	\N	\N	\N	\N	\N
24055832-faf9-4a6b-ba9c-634aad89ab88	ee54ee4c-5adf-4a40-acda-403c1bfced50	\N	\N	\N	\N	hotel	2026-07-18	2026-08-08	\N	1 Bedroom - Twin Beds	\N	\N	Punthill Oakleigh	\N	\N	\N	\N	\N	\N	applied	\N	2026-04-11 11:46:00.014427	2026-04-11 11:46:00.014427	t	Can be changed	\N	\N	\N	\N	\N	\N
6be414de-b283-469d-afd6-8ff1ecd2460a	a3e30696-0225-483e-a287-752aeeb9a200	\N	\N	\N	\N	hotel	2026-07-18	2026-08-08	\N	1 Bedroom - Twin Beds	\N	\N	Brady Hotel Hardware	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:46:03.729766	2026-04-11 11:46:03.729766	t	\N	\N	\N	\N	\N	\N	\N
55a6e215-b555-4999-967b-616868d35600	a93da133-21f8-4958-8cd5-9993048fb1b8	\N	\N	\N	\N	hotel	2026-07-18	2026-08-08	\N	1 Bedroom - Twin Beds	\N	\N	Punthill Oakleigh	\N	\N	\N	\N	\N	\N	applied	\N	2026-04-11 11:46:07.461917	2026-04-11 11:46:07.461917	t	Can be changed	\N	\N	\N	\N	\N	\N
c591500b-ed92-4304-a6fd-005ba470d625	20b6c86c-3c39-48be-a9ed-fcce5ab702c6	\N	\N	\N	\N	hotel	2026-07-18	2026-08-08	\N	1 Bedroom - Twin Beds	\N	\N	Punthill Oakleigh	\N	\N	\N	\N	\N	\N	applied	\N	2026-04-11 11:46:11.158009	2026-04-11 11:46:11.158009	t	Can be changed	\N	\N	\N	\N	\N	\N
10a67230-6ec5-48db-b0be-d95c66648f49	3cda3dcc-2c4b-46fb-90b4-4836227db98c	\N	\N	\N	\N	hotel	2026-07-25	2026-08-15	\N	1 Bedroom - Twin Beds	\N	\N	Brady Hotel Flinders	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:46:14.740831	2026-04-11 11:46:14.740831	t	\N	\N	\N	\N	\N	\N	\N
bd255b2b-6ff1-4ed5-8a38-d950fd3e1304	461c6292-fb62-41f1-840a-d8dcb94a2a89	\N	\N	\N	\N	hotel	2026-07-18	2026-08-08	\N	2 Bedroms	\N	\N	Brady Hotel Hardware	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:46:18.380316	2026-04-11 11:46:18.380316	t	\N	\N	\N	\N	\N	\N	\N
d1965ca5-1017-40fa-9b81-71afb203d927	c1ed920a-cf61-4015-a0ba-bfc7fd25d2cd	\N	\N	\N	\N	hotel	2026-07-18	2026-08-08	\N	2 Bedroms	\N	\N	Brady Hotel Hardware	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:46:21.997548	2026-04-11 11:46:21.997548	t	\N	\N	\N	\N	\N	\N	\N
21c27476-7338-4988-b7f9-a5eeec108dca	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	\N	\N	\N	hotel	\N	\N	\N	\N	\N	\N	Brady Hotel Hardware	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:46:25.622207	2026-04-11 11:46:25.622207	t	\N	\N	\N	\N	\N	\N	\N
b0f7b755-b8fd-4ba3-8fb2-7188c8430cf6	a80eef58-2a15-4a7d-8566-69fd824d2313	\N	\N	\N	\N	hotel	\N	\N	\N	\N	\N	\N	Jacana Apartments	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:46:29.386754	2026-04-11 11:46:29.386754	t	\N	\N	\N	\N	\N	\N	\N
a47c9b3b-9b3a-4796-af22-6db2ddc91cab	bfc32694-5d78-4a94-aebb-87902d57154d	\N	\N	\N	\N	hotel	2026-06-12	2026-08-08	\N	1 Bedroom - Twin Beds with Extra Bed	\N	\N	Punthill Oakleigh	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:46:32.952899	2026-04-11 11:46:32.952899	t	\N	\N	\N	\N	\N	\N	\N
2ad1e489-89c2-4b5c-afa6-b728be072516	d440f5c0-aa75-4c7b-afab-673a3168f07e	\N	\N	\N	\N	hotel	\N	\N	\N	\N	\N	\N	Punthill Oakleigh	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:46:36.621767	2026-04-11 11:46:36.621767	t	\N	\N	\N	\N	\N	\N	\N
f846c1d3-d479-4ff7-aa32-3cc1261b0860	27a7de5a-55cc-420f-bbb3-d39a985828a9	\N	\N	\N	\N	hotel	\N	\N	\N	\N	\N	\N	Punthill Oakleigh	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:46:40.309493	2026-04-11 11:46:40.309493	t	\N	\N	\N	\N	\N	\N	\N
3fcaf429-8af2-4e41-b11e-3ace0910cc16	e5cf9530-24d2-435d-8b2b-9f70bf75d7ab	\N	\N	\N	\N	hotel	\N	\N	\N	\N	\N	\N	Punthill Oakleigh	\N	\N	\N	\N	\N	\N	searching	\N	2026-04-11 11:46:43.987753	2026-04-11 11:46:43.987753	t	\N	\N	\N	\N	\N	\N	\N
\.


ALTER TABLE myagency.accommodation_mgt ENABLE TRIGGER ALL;

--
-- Data for Name: account_company_profiles; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.account_company_profiles DISABLE TRIGGER ALL;

COPY myagency.account_company_profiles (id, account_id, industry, company_size, abn, contact_person, contact_title, contact_email, contact_phone, available_positions, placement_fee_type, placement_fee, requires_police_check, requires_wwcc, dress_code, work_address, is_active, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE myagency.account_company_profiles ENABLE TRIGGER ALL;

--
-- Data for Name: account_contacts; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.account_contacts DISABLE TRIGGER ALL;

COPY myagency.account_contacts (id, account_id, contact_id, role, created_on) FROM stdin;
\.


ALTER TABLE myagency.account_contacts ENABLE TRIGGER ALL;

--
-- Data for Name: account_homestay_profiles; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.account_homestay_profiles DISABLE TRIGGER ALL;

COPY myagency.account_homestay_profiles (id, account_id, room_type, accommodation_type, meal_included, weekly_rate, partner_weekly_cost, distance_to_school, max_students, available_from, host_name, host_contact, property_address, amenities, house_rules, is_currently_occupied, current_student_count, is_active, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE myagency.account_homestay_profiles ENABLE TRIGGER ALL;

--
-- Data for Name: account_hotel_profiles; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.account_hotel_profiles DISABLE TRIGGER ALL;

COPY myagency.account_hotel_profiles (id, account_id, room_type_name, star_rating, meal_included, retail_price_per_night, partner_cost_per_night, total_rooms, check_in_time, check_out_time, property_address, distance_to_school, distance_to_cbd, amenities, booking_contact, cancellation_policy, is_active, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE myagency.account_hotel_profiles ENABLE TRIGGER ALL;

--
-- Data for Name: account_ledger_entries; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.account_ledger_entries DISABLE TRIGGER ALL;

COPY myagency.account_ledger_entries (id, account_id, source_type, source_id, contract_id, entry_type, amount, currency, original_amount, original_currency, aud_equivalent, exchange_rate_to_aud, status, description, entry_date, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE myagency.account_ledger_entries ENABLE TRIGGER ALL;

--
-- Data for Name: account_pickup_profiles; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.account_pickup_profiles DISABLE TRIGGER ALL;

COPY myagency.account_pickup_profiles (id, account_id, driver_name, driver_contact, driver_license_no, vehicle_make, vehicle_model, vehicle_color, plate_number, vehicle_year, capacity, service_area, service_airports, base_rate, night_rate, extra_stop_rate, is_available, is_active, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE myagency.account_pickup_profiles ENABLE TRIGGER ALL;

--
-- Data for Name: account_school_profiles; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.account_school_profiles DISABLE TRIGGER ALL;

COPY myagency.account_school_profiles (id, account_id, cricos_code, rto_code, enrolment_officer, enrolment_email, enrolment_phone, intake_months, academic_calendar, default_commission_rate, commission_basis, available_courses, can_sponsor_student_visa, oshc_required, emergency_contact, is_active, notes, created_at, updated_at, institution_type) FROM stdin;
\.


ALTER TABLE myagency.account_school_profiles ENABLE TRIGGER ALL;

--
-- Data for Name: account_service_categories; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.account_service_categories DISABLE TRIGGER ALL;

COPY myagency.account_service_categories (id, account_id, service_type, is_active, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE myagency.account_service_categories ENABLE TRIGGER ALL;

--
-- Data for Name: account_tour_profiles; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.account_tour_profiles DISABLE TRIGGER ALL;

COPY myagency.account_tour_profiles (id, account_id, tour_name, tour_type, tour_category, duration_hours, duration_days, min_participants, max_participants, default_pickup_location, pickup_available, operates_on, departure_time, return_time, inclusions, exclusions, adult_retail_price, child_retail_price, partner_cost, advance_booking_days, cancellation_policy, booking_contact, guide_languages, thumbnail_url, is_active, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE myagency.account_tour_profiles ENABLE TRIGGER ALL;

--
-- Data for Name: accounts; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.accounts DISABLE TRIGGER ALL;

COPY myagency.accounts (id, name, manual_input, account_type, account_category, parent_account_id, primary_contact_id, secondary_contact_id, phone_number, phone_number_2, fax, email, website, website_url_2, address, secondary_address, country, state, city, postal_code, abn, payment_info_id, is_product_source, is_product_provider, found_year, total_capacity, logo_id, agreement_id, avetmiss_delivery_location_id, description, owner_id, status, created_on, modified_on, bank_account_type, portal_access, portal_role, portal_email, portal_password_hash, portal_temp_password, portal_temp_pw_expires, portal_must_change_pw, portal_last_login_at, portal_failed_attempts, portal_locked_until, portal_invited_at, location, first_name, last_name, english_name, original_name, profile_image_url, organisation_id, privacy_consent, marketing_consent) FROM stdin;
7b8d3fed-f090-4bdc-ae38-fd5af26f00c9	EduBee.Co	f	Admin	\N	\N	\N	\N	\N	\N	\N	admin@edubee.co	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:06:31.432254	2026-04-11 08:06:31.432254	\N	f	\N	\N	\N	EduEd2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
7c81ca5c-6cde-4876-9528-ddaf3f5143f9	Noon Condo	f	Accommodation	\N	\N	\N	\N	\N	\N	\N	noon@example.com	\N	\N	\N	\N	Thailand	\N	Phuket	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:41.292817	2026-04-11 08:07:41.292817	\N	f	\N	\N	\N	NooCo2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
bc14181a-18b8-40c1-b506-40ba7be97fdd	Ji Young CHOI	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	010-8334-8013	\N	\N	uuu1022@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:26.530765	2026-04-11 08:10:26.530765	\N	f	\N	\N	\N	Ji Yo2026!!	\N	f	\N	0	\N	\N	\N	Ji Young	CHOI	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
d3c8c676-3bd5-4e2a-b0b7-93d148dac77c	Acknowledge Education	f	Institute	\N	\N	\N	\N	+61 3 9663 3399	+61 459 324 065	\N	lucy.li@ae.edu.au	https://www.acknowledgeeducation.edu.au/	MEL-LANG	168 Exhibition St, Melbourne VIC 3000	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:06:35.614112	2026-04-11 08:06:35.614112	\N	f	\N	\N	\N	AckEd2026!!	\N	f	\N	0	\N	\N	\N	Lucy	LI	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/Ivt_iT-mnyOO9FzwVWQ_Yg/q89qGKR3OGU12QT80OkN50DzRuMGBqNDWCQmoKhbrqhoOYI6t2gEpR3oOyL8otf9YTOstLaXNEdeZBskl19pB497Bf_mFm34sity_SSYiVfYL-E9n3_YtACGVgQZ1pjM_Vl7NxWNAlP3wKhGSwCny-87BD7UIyml9B3S3UydCqs/xRXbBLAatrxHRfvg7b2KZ03yWU-OdIouxTiGG0Ttl2k	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
78606362-6a21-43e3-9594-5d437f55c9fb	Collingwood College	f	Institute	\N	\N	\N	\N	+61 3 9417 6681	\N	\N	felicia.peh@education.vic.gov.au	https://www.collingwood.vic.edu.au/	\N	1/7 McCutcheon Way, Collingwood VIC 3066	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:06:39.741444	2026-04-11 08:06:39.741444	\N	f	\N	\N	\N	ColCo2026!!	\N	f	\N	0	\N	\N	\N	Felicia	PEH	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/mXO3O7aB5wI4m5_pVHIPDA/NcSrB5dWTW5hqp8Cp8dvyYqD0nCx7FijpILStxbi025ud12YtRVoBKneo4XpVGYaLGXXqFBG00BwjFdFQyMQ_SGqhVxnARZsR-aQ7FSfOfccfXswDBEHT8YKEor4UL6WzgrV4E_PhCDAhheoLCgAqqK7KV_DtQO9WSI8BNMxRo4/sk_uWbnSvFjmYheBYwTlRiV8b92LBd8vAndlF6Dyc6M	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
fe6f0a61-6cbc-4a9e-b12e-8070cdfde47e	Oakleigh Grammar	f	Institute	\N	\N	\N	\N	+61 3 9569 6128	\N	\N	zzhang@oakleighgrammar.vic.edu.au	https://www.oakleighgrammar.vic.edu.au	\N	77/81 Willesden Rd, Oakleigh VIC 3166	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:06:43.85888	2026-04-11 08:06:43.85888	\N	f	\N	\N	\N	OakGr2026!!	\N	f	\N	0	\N	\N	\N	Samantha	ZHANG	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/nsH0gUiKcoN8v3T8Y8UuMg/0YpfwPWAjELSSlsOJf67dIuEezN3n5CqmUnoFNB5mFB75buOO3kgREqx2YHP6081bFscHGlrDFoD6UYZWHqAMojzsNd09-6QAIUqpi92bv0ZDm6BWUyvpKJ7DE_CekJzMDuJ-rlvAUkW1gMOh_8IG9LgEaDH4ZEbeaDQwxdi4RQ/iquw_TcjSFbdUnc_A9BbAS72mRhdHPwEpexqwLYoM28	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
c082d1f9-b7d4-48f2-b99b-a12347600f4a	Lighthouse International School	f	Institute	\N	\N	\N	\N	+66 96 346 9393	\N	\N	secondary@lighthousephuket.com	https://lighthousephuket.com/	\N	21 1 Soi Salika, Rawai, Mueang Phuket District, Phuket 83100	\N	Thailand	\N	Phuket	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:06:47.865993	2026-04-11 08:06:47.865993	\N	f	\N	\N	\N	LigIn2026!!	\N	f	\N	0	\N	\N	\N	Kirk	\N	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/Q3UV7UOkw3Dm5NWSBWGOaw/J3-XGPIUIAirmeMWU8UcY2aDt6GtMO9bjyMqfLHdPnu4srl_FCXjFghSlDaWmhJy4JAymAiJxpMeeP_63MGdFQlFM15dwFt3WixQaoTKGk-6LAnSU_qmXOFWFFGl4ekCkY4z99fpHqDm220mtN8LeeJ009wFMeChOLiM-mxlDw8/ATl8LXF-jVbZa6EqtfH3lFpllYETwR-DQWu2VyL_ozI	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
b5b2bc1e-4f9a-4a6c-ab92-5c155fda8ae2	Australian International School Bangkok (AISB)	f	Institute	\N	\N	\N	\N	+66 2 662 2827	+66 9 9218 1546	\N	admin31@australianisb.ac.th	https://www.australianisb.ac.th/	\N	319 Sukhumvit 31, Khlong Toei Nuea, Watthana, Bangkok 10110,	\N	Thailand	\N	Bangkok	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:06:52.986633	2026-04-11 08:06:52.986633	\N	f	\N	\N	\N	AusIn2026!!	\N	f	\N	0	\N	\N	\N	Shailly	SETHI	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/eTkQuaLW6yRnXpffdmwMrQ/pFA2QfdXJJxL1T_XG_6cjT6YMJPsQRAoBXKr4TVy1D-Ydtk0rXm5qvd_CvfXL3ujRohUdiJTeNjReUbffTuwRSx0xkLPUyRSmlew7-IIC4IIz6nEusyqKoBnqH-d_qk0t-5LEj3iqU7k_h-YHGksIotY8Y2fs7eestjvKCR-PWs/5j7VbuZPsHa0uqseVyrjAtlTPzet7ht1TR1pbODtgiE	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
11f3f59c-33b5-4deb-aabe-686ef474e4a2	Lloyd Street Primary	f	Institute	\N	\N	\N	\N	03 9573 4600	\N	\N	Susan.Heggen@education.vic.gov.au	http://www.lloydstps.vic.edu.au/	\N	\N	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:06:56.846907	2026-04-11 08:06:56.846907	\N	f	\N	\N	\N	LloSt2026!!	\N	f	\N	0	\N	\N	\N	Sue	Heggen	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/jnHvrqJGfm3shCqYHzYNYA/4kdyeU6zQ3os8bm0vUPhyWl1DH5yht9h4e9elrxLnpQsz4MI7w1Ifr3y4VJmVD8TkQ64bjdvCnpjg4waiOsfPq_klw_5roCWvZTnpY1MdL-n9cXfRprLDSeLZGjH2ZOQw4bKzRFBWwrrcAr36b4s_00Lz9jUQo9e5AICfyqTjLo/RQs_1EsWQJ9q7vheAsoeAy4vbEm0lpCvpKGbEnQoxpU	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
559e0e4f-8193-4250-8e1f-d64ea7b60ecb	The Cathedral School	f	Institute	\N	\N	\N	\N	+61 7 4722 2000	\N	\N	registrar@cathedral.qld.edu.au	https://cathedral.qld.edu.au	\N	154 Ross River Rd, Mundingburra QLD 4812	\N	Australia	\N	Townsville	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:00.949862	2026-04-11 08:07:00.949862	\N	f	\N	\N	\N	TheCa2026!!	\N	f	\N	0	\N	\N	\N	Jane	Neame	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/4imgHwy5snOCA43Q3UofXA/t6oDtgdIVpBsrSBiShe6C3qzmOyyAlWUxZDVmysmLpSSkf-I3WFc0Rj9alx16SqgWKWjl0mb-fTPrEXLQ_anhcFBDE4erRO409WrWVGuck7aadv_VMolZESRaj5zFiXs5_618knBzcc7G0jCYY-OXw/LVqluRUS2ctW4WVnXWxKno4c5FT0Fi5vWiB1vNjmrVM	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
424792b3-cb65-4562-99ff-a357c484a8b6	Jisoo RYU	f	Client	\N	4cc0bfbd-97e3-4aa2-b98f-e3598b02c8cb	\N	\N	01086690520	\N	\N	okiday@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:30.482702	2026-04-11 08:09:30.482702	\N	f	\N	\N	\N	JisRY2026!!	\N	f	\N	0	\N	\N	\N	Jisoo	RYU	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
96402b8b-ab52-4724-a582-42870b453d6b	Brady Hotel HQ	f	Accommodation	\N	\N	\N	\N	\N	+61 0417 579 296	\N	petaw@bradyhotels.com.au	www.bradyhotels.com.au	https://linkedin.com	\N	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:08.977966	2026-04-11 08:07:08.977966	\N	f	\N	\N	\N	BraHo2026!!	\N	f	\N	0	\N	\N	\N	Peta	Williams	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/MAi9DmzgiNRL6izX1Ckfog/DaV8bPdOYnoa58QU53EARVSmAJzd5cogvkeQ7Mz0bdCqfidzx_mUVOtAecTuH3iedkXujZoQxj31KZoXNf4YgkHPYC5ofVpHNB5r0s1BJ8BJi7bbFKsqlazVoRF_TZddRhWquooIYPjSSK_WKi0fm_QEreO0a-cnDCsts28AY_g/0Rse7eyj8DKalceulLpRhVHlsQnLoLiVneIsTVpfAfc	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
60b14d2f-73bc-4aa2-938e-6a687b83f9a0	Brady Hotel Flinders	f	Accommodation	\N	\N	\N	\N	+61 3 8374 7999	+61 432 692 526	\N	anim@bradyhotels.com.au	www.bradyhotels.com.au	\N	550 Flinders Street Melbourne VIC 3000	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:13.070904	2026-04-11 08:07:13.070904	\N	f	\N	\N	\N	BraHo2026!!	\N	f	\N	0	\N	\N	\N	Ani	Morgan	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/w1UP2H-B1hjzp-ES7uogyw/3d9M6tftBD5-kKdzCMkP8whGce_smA-zNMyzLt3kesiueVZJb70EhHyozv0d6BBLuPTi9G6Hav1vZvQvdIiy_at5owoH0lT8b62CUw3PXxi4mCDQThuTY7OmfWwpEpOlh47oucjPZorpLcs8Bed0N93adAfbEmFNYCKSdiBx3N0/7-UFnxCTT00rBJHtIvBzQDPAFu-K_UCc61OszmRIh0A	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
92a1e82d-3b3d-4ddc-9a27-d57551037488	Brady Hotel Hardware	f	Accommodation	\N	\N	\N	\N	+61 3 8616 8999	+61 432 692 526	\N	anim@bradyhotels.com.au	www.bradyhotels.com.au	\N	388 Lonsdale Street Melbourne VIC 3000	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:16.999156	2026-04-11 08:07:16.999156	\N	f	\N	\N	\N	BraHo2026!!	\N	f	\N	0	\N	\N	\N	Ani	Morgan	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/w1UP2H-B1hjzp-ES7uogyw/3d9M6tftBD5-kKdzCMkP8whGce_smA-zNMyzLt3kesiueVZJb70EhHyozv0d6BBLuPTi9G6Hav1vZvQvdIiy_at5owoH0lT8b62CUw3PXxi4mCDQThuTY7OmfWwpEpOlh47oucjPZorpLcs8Bed0N93adAfbEmFNYCKSdiBx3N0/7-UFnxCTT00rBJHtIvBzQDPAFu-K_UCc61OszmRIh0A	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
97b4fdaa-6aa6-4a8b-a1bd-f95e0ba3a50b	Veriu Group	f	Accommodation	\N	\N	\N	\N	1300 964 821	\N	\N	info@veriugroup.com.au	veriu.com.au	\N	\N	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:21.180169	2026-04-11 08:07:21.180169	\N	f	\N	\N	\N	VerGr2026!!	\N	f	\N	0	\N	\N	\N	Tram	TRAN	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
5cc5e553-b34e-4522-b005-a44f483d7d52	Punthill Oakleigh	f	Accommodation	\N	\N	\N	\N	+61 3 9038 7676	\N	\N	oakleigh.reception@punthill.com.au	https://punthill.com.au/	\N	2/1384 Dandenong Rd, Hughesdale VIC 3166	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:25.077341	2026-04-11 08:07:25.077341	\N	f	\N	\N	\N	PunOa2026!!	\N	f	\N	0	\N	\N	\N	Fern	\N	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/TaNZD7qd2Mllbb-pkYEkng/pXZnyp7La0oIAyaW7mt3Y2cxOpChI6mwWjhPhQAcfN9SIr9P638DAUnPAffz_6ryNoJq8s7KmYiXe7u5k8w7alHPoq2SltyO8-aeFuTTYW9LHh7fiaHrWt2B3E6QkoRDEg0GT0Iz6Mt0UMex2-GjKKzP-j0DvFnMQ19I4JeeoXs/WGgvlBd2lnientc_aFUZ9CSk0YC_YcH0tPUvIHh1s6k	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
e3d98c83-2295-4925-90b7-386731703daa	DLUX Condominium	f	Accommodation	\N	\N	\N	\N	+66 94 593 7156	\N	\N	dlux.roy@gmail.com	https://www.facebook.com/dluxphuket/	\N	\N	\N	Thailand	\N	Phuket	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:29.20663	2026-04-11 08:07:29.20663	\N	f	\N	\N	\N	DLUCo2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
e43497e0-a64d-4208-8f4b-0624c3277eb4	Youjung LEE	f	Client	\N	\N	\N	\N	01034713252	\N	\N	dand1002@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:10.097595	2026-04-11 08:09:10.097595	\N	f	\N	\N	\N	YouLE2026!!	\N	f	\N	0	\N	\N	\N	Youjung	LEE	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
b2e7ce5f-8eaa-4459-b6ad-0672375b2246	Sebel Melbourne Malvern	f	Accommodation	\N	\N	\N	\N	\N	\N	\N	\N	https://all.accor.com/ssr/app/accor/rates/B4G3/index.en.shtml?dateIn=2025-09-05&nights=1&compositions=2&stayplus=false&snu=false&accessibleRooms=false&hideWDR=true&productCode=null&hideHotelDetails=true&origin=accor&gclid=Cj0KCQjwn8XFBhCxARIsAMyH8BsbAsMStr8Y4h36KveydHKLqeU3bgXwpIiMcZjEzpUgsSr2zNtEgzwaAkJfEALw_wcB&utm_campaign=B4G3-AU-cpc-desktop-default-0--localuniversal-22222835409-0-0-1&utm_medium=partenariats&hmGUID=938a648e-a89a-496b-b6fe-2114c6d81b80&utm_source=Google%20Hotel%20Ads	\N	\N	\N	South Korea	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:33.236582	2026-04-11 08:07:33.236582	\N	f	\N	\N	\N	SebMe2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
a410e2e3-6576-46ee-a3cb-4eae1b354dfa	Jacana Apartments	f	Accommodation	\N	\N	\N	\N	07 4723 4644	\N	\N	stay@itara-jacana.com.au	www.itara-jacana.com.au	\N	\N	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:37.298461	2026-04-11 08:07:37.298461	\N	f	\N	\N	\N	JacAp2026!!	\N	f	\N	0	\N	\N	\N	Kat	Watson	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/oYXOrM-wXHvCTbpqL-gZwA/Yx6vf3hg0IhCOu1DPnlug5UGeMdO5vX6tyeBrQenI7ck3L2cpUQUwNgmq13njVYFPhSYU84jSd6qpktZjlw6S6wWGhO4YhhqqAsAPAP2aBRFRh3ZzWHLxCT4dDI22qIJj2J2sF0pwepRuiAVkz8R1uxJEAr4paexBdxI_7hopDk/P2p9EvHwvTNTGeJfDQLjs6I8KBxlAvcTRULaoSkFBtM	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
d2270152-0208-447e-9552-de94ef5d58c8	HOMA Chalong	f	Accommodation	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Thailand	\N	Phuket	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:45.343218	2026-04-11 08:07:45.343218	\N	f	\N	\N	\N	HOMCh2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
c978ded0-51a0-4cf8-83cd-71a0472a8f8e	Jasmine 59 Hotel	f	Accommodation	\N	\N	\N	\N	+66 2 666 9999	\N	\N	RSVN_Jasmine59@jasminecity.com	https://www.jasmine59.comja	\N	\N	\N	Thailand	\N	Bangkok	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:49.497481	2026-04-11 08:07:49.497481	\N	f	\N	\N	\N	Jas592026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/yUTHFyrd2791EK4zI4JEug/rEXolADnn0s6W9sjksI3IadndYQ-LtfaEdQTL0Ka9VHasRAwPcUE9XkWSUTuyVQQdr6SEH4qZwybVcFtsaL86AIEYN9Vh7OWVppqxONGR4EkRLkPvQaz9NGR5TMb0UTAscuChDe3Yld5oWdgvdlMeTKG5gruOeeIIdQrMTrwHRY/IVbLqe9XH1xPub55kS0gYu8nvW0ON4YusFnRmW0FERw	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
b29518df-6fc1-478a-ad90-50f1145ff479	RED Uhak	f	Education Agent	\N	\N	\N	\N	+82 2 3453 7779	\N	\N	jamie@reduhak.com	https://www.reduhak.com	https://linkedin.com	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:53.511813	2026-04-11 08:07:53.511813	\N	f	\N	\N	\N	REDUh2026!!	\N	f	\N	0	\N	\N	\N	Sofie	SUN	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/7aF2_jgNAXARn15SBKduAw/FZFIjyjcRyVbUrfsz_PAeOld65j7nRpCSkUPc4-98ghziLndyxYL-2u7EEGVo5g5DQRtc6IYd0QCvAmQ5fHJgKABMpabsWCqCA32V0nWcOdPz81UT_2hB4do2aajtZmYrdjtvyJ6xOp3ju3O7ajcBzA6A4GO1S9KZEgoJNrCAuI/Ru85Dj0wXEDt0HKJ_e9OuU1ITP9ryEvTJTU0mmuIPiE	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
663b3862-a078-4a55-ad5b-230f8c3331db	COEI (CHONGRO Overseas Educational Institute)	f	Education Agent	\N	\N	\N	\N	+82 2 5990091	\N	\N	sep01@coei.com	https://www.coei.com/	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:57.600655	2026-04-11 08:07:57.600655	\N	f	\N	\N	\N	COE(C2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
626c15b0-bac0-453b-a314-9f1a8adaa81f	Angel Explorers	f	Education Agent	\N	\N	\N	\N	+6681 649 7353	+ 6681 925 9523	\N	angelexplorers@gmail.com	https://www.angelexplorers.net	\N	\N	\N	Thailand	\N	Bangkok	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:10.003271	2026-04-11 08:08:10.003271	\N	f	\N	\N	\N	AngEx2026!!	\N	f	\N	0	\N	\N	\N	Apple K	Somsri	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/YHdRJ4TEkWPEgmIk7iC5Jg/548Y1fwW0CDM5g8X6ZouIlLIMiOC7js2PQV7wvEkmvnYCBIy6n2SoV2m7t-DtN5HbvRMqy_DC7DWDagQiN4ffIzVGPOsq5-RCqLIYJFTShhohG5abzjgAf9JeEyYyEQVKy7xjAE0NW5rzea6BaujdgI83rycfoevp6mvKCT8KXxD7ebVygrauROS_YEfWAdK/gJZIKT-8olrs1NWmKoTBtdJRGjvCuewUM1p22RI8fDw	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
4cc0bfbd-97e3-4aa2-b98f-e3598b02c8cb	MomWith	f	Education Agent	\N	\N	\N	\N	\N	\N	\N	okiday@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:14.033799	2026-04-11 08:08:14.033799	\N	f	\N	\N	\N	MomMo2026!!	\N	f	\N	0	\N	\N	\N	Jisoo	RYU	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
2cd39131-3cf7-4530-b108-038152c4cae4	Lime Education	f	Education Agent	\N	\N	\N	\N	+82 2 2135 7699	+82 10 4149 0703	\N	js.roh@mylimeedu.com	www.mylimeedu.com	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:18.115197	2026-04-11 08:08:18.115197	\N	f	\N	\N	\N	LimEd2026!!	\N	f	\N	0	\N	\N	\N	Jaesuk	ROH	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
ac4d626d-7737-447f-b413-b8712c43b9eb	Hayoung JUNG	f	Client	\N	4cc0bfbd-97e3-4aa2-b98f-e3598b02c8cb	\N	\N	01027379915	\N	\N	oli131019@gmail.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:22.508314	2026-04-11 08:10:22.508314	\N	f	\N	\N	\N	HayJU2026!!	\N	f	\N	0	\N	\N	\N	Hayoung	JUNG	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
cdebce4f-420b-4ff9-baa9-a44f434ef0e5	Kyungmi SON	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	01093686560	\N	\N	skyward14@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:46.461621	2026-04-11 08:13:46.461621	\N	f	\N	\N	\N	KyuSO2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
dbcecfa8-a283-4213-b101-5af0dfd71fad	Thanks Tour	f	Tour Agent	\N	\N	\N	\N	+61 3 9812 0022	+61 431 844 084	\N	info@thankstour.com	https://thankstour.com/	카톡 : thankstour	\N	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:21.993142	2026-04-11 08:08:21.993142	\N	f	\N	\N	\N	ThaTo2026!!	\N	f	\N	0	\N	\N	\N	Wanju	HEO	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/wIU0HL556_jyyUdG2j8JGg/eUZhCpZYF4sF0ncxygXjiF48Cjh8sdei8LFAuPdDdSeEiNFHgwIKcFBOwx_uJcFThxv9cRgQjRvbt4mltdw9myqUWG0sVOm0562KC6IxzTqHiWXQIgeTL2qjn74iGUtQPJlH2cLJB63GlvM5KC330KLb26h6BjGX7cNBShkubGI/j7_7tUWNQ0aRxIlvmSG4Oojws2Mltm9TE0Lv3PGf2_g	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
4865d093-e206-4670-aa16-ce6bda99e6ea	Boong Boong Pickup	f	Pickup Driver	\N	\N	\N	\N	\N	+ 61 475 509 817	\N	boong@example.com	https://melbournepickup.com.au/	카톡: acepickup	\N	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:26.031636	2026-04-11 08:08:26.031636	\N	f	\N	\N	\N	BooBo2026!!	\N	f	\N	0	\N	\N	\N	Taesang	YUN	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
05a76fa1-d54c-4bc1-a662-e9010e089638	Townsville_Jaehoon JUNG	f	Pickup Driver	\N	\N	\N	\N	+61 402 715 038	(040) 271-5038	\N	trueangel26@naver.com	\N	\N	\N	\N	Australia	\N	Townsville	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:30.253479	2026-04-11 08:08:30.253479	\N	f	\N	\N	\N	TowJU2026!!	\N	f	\N	0	\N	\N	\N	Jaehoon	JUNG	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
0f8383ef-1449-4cd3-9159-2d6afc7ea040	Eunmi CHOI	f	Client	\N	\N	\N	\N	\N	+82 10 4595 6904	\N	mi0404mi@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:42.114729	2026-04-11 08:08:42.114729	\N	f	\N	\N	\N	EunCH2026!!	\N	f	\N	0	\N	\N	\N	Eunmi	CHOI	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
62a76539-4cb3-41db-8826-5c1125789251	Seoyeun PARK	f	Client	\N	\N	\N	\N	\N	\N	\N	seoyeunpark@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:46.051658	2026-04-11 08:08:46.051658	\N	f	\N	\N	\N	SeoPA2026!!	\N	f	\N	0	\N	\N	\N	Seoyeun	PARK	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
6d2bc907-5425-405e-b9f0-033b57c728be	Sooa KIM	f	Client	\N	\N	\N	\N	\N	010 5141 1033	\N	young96240@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:50.014089	2026-04-11 08:08:50.014089	\N	f	\N	\N	\N	SooKI2026!!	\N	f	\N	0	\N	\N	\N	Sooa	KIM	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
9158411c-ab57-4db1-9fd7-9c95ec2bc0a3	Suyeon HONG	f	Client	\N	\N	\N	\N	\N	010 9778 0385	\N	duddo12@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:54.041891	2026-04-11 08:08:54.041891	\N	f	\N	\N	\N	SuyHO2026!!	\N	f	\N	0	\N	\N	\N	Suyeon	HONG	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
639cd59b-682b-4175-b3bb-b6b3bf24f09f	Suyoung KIM	f	Client	\N	\N	\N	\N	\N	\N	\N	sososo2580@hanmail.net	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:58.034636	2026-04-11 08:08:58.034636	\N	f	\N	\N	\N	SuyKI2026!!	\N	f	\N	0	\N	\N	\N	Suyoung	KIM	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
91a706c8-2a23-4085-b422-583429edc361	Hyunkyung KO	f	Client	\N	\N	\N	\N	\N	\N	\N	caption74@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:02.155494	2026-04-11 08:09:02.155494	\N	f	\N	\N	\N	HyuKO2026!!	\N	f	\N	0	\N	\N	\N	Hyunkyung	KO	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
56f87f4b-6784-47dd-888c-d9d3b9dca624	Wheesung ROH	f	Client	\N	\N	\N	\N	01051130204	\N	\N	wheesung.roh@gmail.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:06.109316	2026-04-11 08:09:06.109316	\N	f	\N	\N	\N	WheRO2026!!	\N	f	\N	0	\N	\N	\N	Wheesung	ROH	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
c2dcb151-fa61-4438-8b5d-c4ce7927ab4d	Jiyoung KIM	f	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	South Korea	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:02.429799	2026-04-11 08:12:02.429799	\N	f	\N	\N	\N	JiyKI2026!!	\N	f	\N	0	\N	\N	\N	Jiyoung	KIM	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
1e1af2bd-9145-44b6-a20a-c9ec4c68a306	Eunjung HONG	f	Client	\N	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	\N	010-3103-0995	\N	76jasmin@hanmail.net	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:34.214821	2026-04-11 08:08:34.214821	\N	f	\N	\N	\N	EunHO2026!!	\N	f	\N	0	\N	\N	\N	Eunjung	HONG	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
ff53daff-040c-46ec-967b-9851d3c90bc8	Eunsil LEE	f	Client	\N	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	\N	010-8991-3751	\N	shiri8537@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:38.075987	2026-04-11 08:08:38.075987	\N	f	\N	\N	\N	EunLE2026!!	\N	f	\N	0	\N	\N	\N	Eunsil	LEE	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
5190843b-c227-4728-9096-bc2f2e013e4a	Youjin AHN	f	Client	\N	\N	\N	\N	\N	\N	\N	anewjeans@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:14.194869	2026-04-11 08:09:14.194869	\N	f	\N	\N	\N	YouAH2026!!	\N	f	\N	0	\N	\N	\N	Youjin	AHN	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
cca895a1-c1e2-4912-83f2-c07fdadc36bd	Heena YANG	f	Client	\N	\N	\N	\N	01091528305	\N	\N	miniypy@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:18.315143	2026-04-11 08:09:18.315143	\N	f	\N	\N	\N	HeeYA2026!!	\N	f	\N	0	\N	\N	\N	Heena	YANG	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
141d490a-e718-4637-b81a-8ba1bb3b939a	Hyekyung BAEK	f	Client	\N	\N	\N	\N	01090258966	\N	\N	phkbada@nate.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:22.418317	2026-04-11 08:09:22.418317	\N	f	\N	\N	\N	HyeBA2026!!	\N	f	\N	0	\N	\N	\N	Hyekyung	BAEK	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
6a84cc21-072e-44bb-8583-c9bc6432ee77	Min Su KANG	f	Client	\N	\N	\N	\N	01024292992	\N	\N	hiphop84@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:26.466198	2026-04-11 08:09:26.466198	\N	f	\N	\N	\N	MinSu2026!!	\N	f	\N	0	\N	\N	\N	Min Su	KANG	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
62fe3789-adb3-4bb8-8e75-b411f13baf96	Bongmin CHOI	f	Client	\N	\N	\N	\N	010-4737-8458	\N	\N	bonnie879@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:14.662187	2026-04-11 08:10:14.662187	\N	f	\N	\N	\N	BonCH2026!!	\N	f	\N	0	\N	\N	\N	Bongmin	CHOI	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
daa8b0b7-639d-480b-86a1-fc32849b38d0	Soojin JUNG	f	Client	\N	\N	\N	\N	01034620226	\N	\N	iksagu@nate.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:18.587911	2026-04-11 08:10:18.587911	\N	f	\N	\N	\N	SooJU2026!!	\N	f	\N	0	\N	\N	\N	Soojin	JUNG	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
fb6fd4cf-4c53-4321-8d48-3ef3c7fdf69d	Woo Hee YOON	f	Client	\N	\N	\N	\N	01041478379	\N	\N	clickuni@hanmail.net	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:54.843138	2026-04-11 08:10:54.843138	\N	f	\N	\N	\N	WooHe2026!!	\N	f	\N	0	\N	\N	\N	Woo Hee	YOON	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
66544e91-74cd-4fd1-9dac-61bfd3b46a67	Hyoju HEO	f	Client	\N	\N	\N	\N	82-10-3241-1525	\N	\N	h10.heo@gmail.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:58.744297	2026-04-11 08:10:58.744297	\N	f	\N	\N	\N	HyoHE2026!!	\N	f	\N	0	\N	\N	\N	Hyoju	HEO	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
18aab0e3-e10c-4a16-b898-1e8994e647e8	Jonghee PARK	f	Client	\N	\N	\N	\N	010-9283-6589	\N	\N	jh0926@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:02.750797	2026-04-11 08:11:02.750797	\N	f	\N	\N	\N	JonPA2026!!	\N	f	\N	0	\N	\N	\N	Jonghee	PARK	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
bc0395e6-84d4-437e-bbb0-943c123190f7	Jung A KIM	f	Client	\N	\N	\N	\N	01091246674	\N	\N	agata016@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:06.728857	2026-04-11 08:11:06.728857	\N	f	\N	\N	\N	JunA 2026!!	\N	f	\N	0	\N	\N	\N	Jung A	KIM	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
e76e3f4b-d552-4738-bf35-37e19e91a619	DET (Department of Education and Training Victoria)	f	Institute	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:10.704926	2026-04-11 08:11:10.704926	\N	f	\N	\N	\N	DET(D2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
ebf7779d-a94a-4ed3-a903-ebd380f0d7c8	Lime Uhak	f	Education Agent	\N	\N	\N	\N	\N	\N	\N	lime@example.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:18.887255	2026-04-11 08:11:18.887255	\N	f	\N	\N	\N	LimUh2026!!	\N	f	\N	0	\N	\N	\N	Lime	Uhak	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
bb6d01fb-297d-44b1-81e4-a5882260c12e	Hyojin HEO	f	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	South Korea	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:42.677132	2026-04-11 08:11:42.677132	\N	f	\N	\N	\N	HyoHE2026!!	\N	f	\N	0	\N	\N	\N	Hyojin	HEO	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
06aa4f47-a995-4244-ac83-361b93abe3b6	Jiyeon LEE	f	Client	\N	4cc0bfbd-97e3-4aa2-b98f-e3598b02c8cb	\N	\N	01091037024	\N	\N	minilady0625@gmail.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:34.449951	2026-04-11 08:09:34.449951	\N	f	\N	\N	\N	JiyLE2026!!	\N	f	\N	0	\N	\N	\N	Jiyeon	LEE	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
3a7779fc-3533-420b-898b-cbd7b70e07b8	Euisun AHN	f	Client	\N	4cc0bfbd-97e3-4aa2-b98f-e3598b02c8cb	\N	\N	821092814217	\N	\N	coolsunny81@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:38.374734	2026-04-11 08:09:38.374734	\N	f	\N	\N	\N	EuiAH2026!!	\N	f	\N	0	\N	\N	\N	Euisun	AHN	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
f8ef6f2c-cd47-4d99-88e8-25a740303e47	Sohyun JEONG	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	010-9118-2228	\N	\N	23opal@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:42.346007	2026-04-11 08:09:42.346007	\N	f	\N	\N	\N	SohJE2026!!	\N	f	\N	0	\N	\N	\N	Sohyun	JEONG	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
03552391-5803-466f-a7ed-b58db1adc130	Minju OH	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	01085814029	\N	\N	grhome75@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:50.517448	2026-04-11 08:09:50.517448	\N	f	\N	\N	\N	MinOH2026!!	\N	f	\N	0	\N	\N	\N	Minju	OH	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
03f66e46-85e2-4c3c-98a0-22cec2a5fe1e	Hyesoo KANG	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	01059409101	\N	\N	pinklover.hyezu@gmail.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:54.624265	2026-04-11 08:09:54.624265	\N	f	\N	\N	\N	HyeKA2026!!	\N	f	\N	0	\N	\N	\N	Hyesoo	KANG	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
e13d8523-cb1c-4411-b389-a8055fc32e13	Yesel KIM	f	Client	\N	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	821050964205	\N	\N	yskim8512@gmail.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:58.70894	2026-04-11 08:09:58.70894	\N	f	\N	\N	\N	YesKI2026!!	\N	f	\N	0	\N	\N	\N	Yesel	KIM	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
3ee2c92c-69a0-479d-890a-58fa4cd8aa51	Yongjin PARK	f	Client	\N	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	01029702199	\N	\N	aguayj@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:02.781703	2026-04-11 08:10:02.781703	\N	f	\N	\N	\N	YonPA2026!!	\N	f	\N	0	\N	\N	\N	Yongjin	PARK	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
8aa174e0-2c90-4aaf-b2d6-2ebf2ad49e73	Yejin LIM	f	Client	\N	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	01064741590	\N	\N	lim.yejin@gmail.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:06.843368	2026-04-11 08:10:06.843368	\N	f	\N	\N	\N	YejLI2026!!	\N	f	\N	0	\N	\N	\N	Yejin	LIM	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
153b22b1-8f5e-45fe-bbf2-10fb4b6fa686	Minyoung PARK	f	Client	\N	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	010-4564-3305	\N	\N	myssam3305@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:10.811087	2026-04-11 08:10:10.811087	\N	f	\N	\N	\N	MinPA2026!!	\N	f	\N	0	\N	\N	\N	Minyoung	PARK	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
ec6196e8-b6cc-46be-a579-09d4b60cd5d8	Eunyeong CHAE	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	010-9435-2088	\N	\N	ceync@hanmail.net	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:30.737284	2026-04-11 08:10:30.737284	\N	f	\N	\N	\N	EunCH2026!!	\N	f	\N	0	\N	\N	\N	Eunyeong	CHAE	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
9a34cb78-d614-4048-b287-ccb83dc465e7	Eun Nam CHO	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	01087398734	\N	\N	namiluv@hanmail.net	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:34.662949	2026-04-11 08:10:34.662949	\N	f	\N	\N	\N	EunNa2026!!	\N	f	\N	0	\N	\N	\N	Eun Nam	CHO	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
67f1fd9e-3c38-4053-bdf1-eacd0f52ad2d	Soo Kyeong LEE	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	0808sue@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:38.756495	2026-04-11 08:10:38.756495	\N	f	\N	\N	\N	SooKy2026!!	\N	f	\N	0	\N	\N	\N	Soo Kyeong	LEE	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
168e48d0-3870-45c1-a53b-f22cac9955f8	You Jae KIM	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	lemonkyj@gmail.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:46.679452	2026-04-11 08:10:46.679452	\N	f	\N	\N	\N	YouJa2026!!	\N	f	\N	0	\N	\N	\N	You Jae	KIM	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
1d7f9151-9d5b-4f21-810e-ecbdcae5d667	Hyoju LIM	f	Client	\N	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	01021295630	\N	\N	hyoju.celine@gmail.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:50.870983	2026-04-11 08:10:50.870983	\N	f	\N	\N	\N	HyoLI2026!!	\N	f	\N	0	\N	\N	\N	Hyoju	LIM	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
1896697c-6ade-4a3f-9c31-35b69d7fb42c	Jiyoung CHOI	f	Client	\N	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	South Korea	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:14.682645	2026-04-11 08:11:14.682645	\N	f	\N	\N	\N	JiyCH2026!!	\N	f	\N	0	\N	\N	\N	Jiyoung	CHOI	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
4b120b45-f99a-4ba1-925b-bcca49d15b03	Hanna JUNG	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	PANDA420@NAVER.COM	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:22.881632	2026-04-11 08:11:22.881632	\N	f	\N	\N	\N	HanJU2026!!	\N	f	\N	0	\N	\N	\N	Hanna	JUNG	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
ec73d5a2-da0e-4dcb-89a8-86b837036139	Minjeong OH	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	alswjddlsid@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:26.896318	2026-04-11 08:11:26.896318	\N	f	\N	\N	\N	MinOH2026!!	\N	f	\N	0	\N	\N	\N	Minjeong	OH	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
da656fe1-5e95-4f5c-b093-27e7ebf02056	Hyemi CHOI	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	xkzpfn413@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:30.752153	2026-04-11 08:11:30.752153	\N	f	\N	\N	\N	HyeCH2026!!	\N	f	\N	0	\N	\N	\N	Hyemi	CHOI	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
4eacc29c-7529-46c4-968f-e069281a4e30	Yeonkyung JI	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	asyuki0735@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:34.825445	2026-04-11 08:11:34.825445	\N	f	\N	\N	\N	YeoJI2026!!	\N	f	\N	0	\N	\N	\N	Yeonkyung	JI	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
f657ed59-0cc8-427d-8bc9-f36213b6d9da	Hanna KOOK	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	haanna4029@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:38.755935	2026-04-11 08:11:38.755935	\N	f	\N	\N	\N	HanKO2026!!	\N	f	\N	0	\N	\N	\N	Hanna	KOOK	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
c8e9cf32-42e7-4465-aef6-509e8b324858	Youngjin LEE	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	notwehr80@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:46.630774	2026-04-11 08:11:46.630774	\N	f	\N	\N	\N	YouLE2026!!	\N	f	\N	0	\N	\N	\N	Youngjin	LEE	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
eeeda2bd-fbea-4fde-9d46-c8c16c18bac4	Aekyung PAK	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	bijoux7878@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:50.609046	2026-04-11 08:11:50.609046	\N	f	\N	\N	\N	AekPA2026!!	\N	f	\N	0	\N	\N	\N	Aekyung	PAK	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
986afdea-5dc1-47a0-ab2a-c4e832d47356	Yunyoung MOON	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	moony177@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:54.58653	2026-04-11 08:11:54.58653	\N	f	\N	\N	\N	YunMO2026!!	\N	f	\N	0	\N	\N	\N	Yunyoung	MOON	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
02797717-daca-4215-bd48-61891e227f38	Inyoug PARK	f	Client	\N	2cd39131-3cf7-4530-b108-038152c4cae4	\N	\N	\N	\N	\N	piy3993@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:11:58.506435	2026-04-11 08:11:58.506435	\N	f	\N	\N	\N	InyPA2026!!	\N	f	\N	0	\N	\N	\N	Inyoug	PARK	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
2bd711f2-1454-4697-aaee-7aaca0902c80	Ayeong CHOI	f	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	South Korea	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:46.432325	2026-04-11 08:12:46.432325	\N	f	\N	\N	\N	AyeCH2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
66b42608-3021-448c-a091-735fd866a083	Sehee KIM	f	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	South Korea	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:50.365322	2026-04-11 08:12:50.365322	\N	f	\N	\N	\N	SehKI2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
4b388552-b57a-4d8e-83f2-fde895b73a94	Soyoun PARK	f	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:54.436184	2026-04-11 08:12:54.436184	\N	f	\N	\N	\N	SoyPA2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
1c02a324-2690-4047-95d6-5673e0a04db2	Seulgi LEE	f	Client	\N	\N	\N	\N	01048561765	\N	\N	dewgy@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:42.647823	2026-04-11 08:13:42.647823	\N	f	\N	\N	\N	SeuLE2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
d3d38f8a-8931-4177-b369-377a396bfc18	Vodafone Australia	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:54.441129	2026-04-11 08:13:54.441129	\N	f	\N	\N	\N	VodAu2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
db13db39-4435-4305-af97-94b9e5b5f97f	Transport Victoria	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:58.441296	2026-04-11 08:13:58.441296	\N	f	\N	\N	\N	TraVi2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
b3c4d006-6ec3-4080-836c-434ebbb18677	Suho JO	f	Education Agent	\N	\N	\N	\N	\N	\N	\N	Whtngh0719@gmail.com	\N	\N	\N	\N	South Korea	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:06.400712	2026-04-11 08:14:06.400712	\N	f	\N	\N	\N	SuhJO2026!!	\N	f	\N	0	\N	\N	\N	Suho	JO	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
3a871eba-1656-48be-a0a0-3afbd5da48c9	Mikyoung KIM	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	dalkie2@hanmail.net	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:10.531571	2026-04-11 08:12:10.531571	\N	f	\N	\N	\N	MikKI2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
f1f624e0-2134-4c73-a0eb-507a4dfe8472	Jimin CHOI	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	whjm1004@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:18.527166	2026-04-11 08:12:18.527166	\N	f	\N	\N	\N	JimCH2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
d31afe8c-5c62-4b74-8257-87621bd65599	Eunhye JEONG	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	dol1620@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:22.567114	2026-04-11 08:12:22.567114	\N	f	\N	\N	\N	EunJE2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
735c564b-58a4-4a9d-9678-e557dc021485	MIRAN PARK	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	dunarang84@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:26.513656	2026-04-11 08:12:26.513656	\N	f	\N	\N	\N	MIRPA2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
76ceadb0-89b2-4338-9029-f1faba78cfa1	Jungmoon LEE	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	twinkle0424@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:30.545945	2026-04-11 08:12:30.545945	\N	f	\N	\N	\N	JunLE2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
16ac6c92-652b-4b76-a08c-9c97b355aa62	Ran KIM	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	282lani@hanmail.net	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:34.614752	2026-04-11 08:12:34.614752	\N	f	\N	\N	\N	RanKI2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
93b947b6-0c9c-4627-9569-e223494effb0	Jiyoung LIM	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	limjy0202@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:38.463867	2026-04-11 08:12:38.463867	\N	f	\N	\N	\N	JiyLI2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
153f086b-8a52-4c3f-9892-02d26a8d304f	Jiyeon KIM	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	nefertarynim@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:42.484309	2026-04-11 08:12:42.484309	\N	f	\N	\N	\N	JiyKI2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
afc0e0c4-ccac-4b02-9060-d4f6f5d0e1c5	Nahyun KANG	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	kkanggel@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:58.347094	2026-04-11 08:12:58.347094	\N	f	\N	\N	\N	NahKA2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
e63499eb-6afd-42b4-ab60-0abaf8c37d11	Yoonsu SHIN	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	skmboyc@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:06.380902	2026-04-11 08:13:06.380902	\N	f	\N	\N	\N	YooSH2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
6c53b1b9-7353-4c76-8812-e42d2740d5e2	Ri YOO	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	twinklene@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:10.43008	2026-04-11 08:13:10.43008	\N	f	\N	\N	\N	Ri YO2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
de3d4144-956f-476a-986b-99ea5e700608	Jihyun LEE	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	lizylizy9@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:14.329432	2026-04-11 08:13:14.329432	\N	f	\N	\N	\N	JihLE2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
2e68a1c9-f194-4149-9c97-be04b429db6d	Seungmi LEE	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	mam0415@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:18.666278	2026-04-11 08:13:18.666278	\N	f	\N	\N	\N	SeuLE2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
c3c2ed37-a190-4bfe-912a-b39df5f7b4be	Myung Kyun PARK	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	pmk2092@hanmail.net	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:22.525338	2026-04-11 08:13:22.525338	\N	f	\N	\N	\N	MyuKy2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
c99589e5-e622-4b2f-af0f-5354d3285ba9	Miyoung LIM	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	hiphopria@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:26.518995	2026-04-11 08:13:26.518995	\N	f	\N	\N	\N	MiyLI2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
c867a2fa-05ee-4720-8329-50176bc62024	Oieon PAEK	f	Client	\N	2cd39131-3cf7-4530-b108-038152c4cae4	\N	\N	+82 10 3550-1620	\N	\N	oiseon.paek@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:30.857063	2026-04-11 08:13:30.857063	\N	f	\N	\N	\N	OiePA2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
b4db3696-2aab-4754-bdc6-f7c7c8b57f51	Min A LEE	f	Client	\N	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	01071566577	\N	\N	mj212522@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:38.740963	2026-04-11 08:13:38.740963	\N	f	\N	\N	\N	MinA 2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
49013ad2-3d88-411a-aef1-a78fb8d617af	Hyeonhye HEO	f	Client	\N	4cc0bfbd-97e3-4aa2-b98f-e3598b02c8cb	\N	\N	01098110270	\N	\N	erinheo@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:02.424825	2026-04-11 08:14:02.424825	\N	f	\N	\N	\N	HyeHE2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
b991d12b-6bf5-4d4e-b2cb-e332a3fcb813	Hyewon JEONG	f	Client	\N	b3c4d006-6ec3-4080-836c-434ebbb18677	\N	\N	01084843467	\N	\N	twinkle0826@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:14.286987	2026-04-11 08:14:14.286987	\N	f	\N	\N	\N	HyeJE2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
4e56b3a6-54b3-42ea-a9e9-903a03f6b931	Kahyun KIM	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	1068789025	\N	\N	izzyggu0984@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:22.249366	2026-04-11 08:14:22.249366	\N	f	\N	\N	\N	KahKI2026!!	\N	f	\N	0	\N	\N	\N	Kahyun	KIM	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
55088e1a-5be3-4466-a186-3aed5eaf67d1	Uiji JO	f	Client	\N	4cc0bfbd-97e3-4aa2-b98f-e3598b02c8cb	\N	\N	01047171504	\N	\N	112jo@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:10.362441	2026-04-11 08:14:10.362441	\N	f	\N	\N	\N	UijJO2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
11207dbf-19c6-4bba-b10e-114407b6411a	Uiji JO	f	Client	\N	4cc0bfbd-97e3-4aa2-b98f-e3598b02c8cb	\N	\N	1047171504	\N	\N	112jo@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:26.115676	2026-04-11 08:14:26.115676	\N	f	\N	\N	\N	UijJO2026!!	\N	f	\N	0	\N	\N	\N	Uiji	JO	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
614d1f96-6762-4a76-872c-b638258c774f	Jihye YANG	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	1091138315	\N	\N	jihye0709@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:34.037672	2026-04-11 08:14:34.037672	\N	f	\N	\N	\N	JihYA2026!!	\N	f	\N	0	\N	\N	\N	Jihye	YANG	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
1e30c7ce-50c5-4090-8aa1-d42e43ea42a1	Won Kyeong KIM	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	1086282512	\N	\N	haneulsom@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:38.006338	2026-04-11 08:14:38.006338	\N	f	\N	\N	\N	WonKy2026!!	\N	f	\N	0	\N	\N	\N	Won Kyeong	KIM	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
471d939e-96f0-4181-b944-052bf3cadb10	Miyoung AN	f	Client	\N	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	1020839552	\N	\N	mmyung00@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:41.954582	2026-04-11 08:14:41.954582	\N	f	\N	\N	\N	MiyAN2026!!	\N	f	\N	0	\N	\N	\N	Miyoung	AN	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
2a6f9cee-8e77-4ff1-88c5-181f175c3a68	Taewon GU	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	1022090050	\N	\N	gtw0107@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:45.84695	2026-04-11 08:14:45.84695	\N	f	\N	\N	\N	TaeGU2026!!	\N	f	\N	0	\N	\N	\N	Taewon	GU	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
40f72416-068c-4a46-9b2a-83c600e73d44	Jia CHA	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	1098766305	\N	\N	sk2cha@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:30.093251	2026-04-11 08:14:30.093251	\N	f	\N	\N	\N	JiaCH2026!!	\N	f	\N	0	\N	\N	\N	Jia	CHA	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
30635bdf-7cac-4eb4-a922-05479be3cb34	Boong Boong Pickup	f	Partner	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:18.2631	2026-04-12 16:43:42.263	\N	f	\N	\N	\N	BooBo2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
80d62035-8457-43c0-91b9-c556ef023361	Jung Won SA	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	01064585537	\N	\N	harky00@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:58.339716	2026-04-11 08:14:58.339716	\N	f	\N	\N	\N	JunWo2026!!	\N	f	\N	0	\N	\N	\N	Jung Won	SA	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
e4f8a28d-b7c4-41f1-86e4-ff4686f5c760	Ahyoung YOON	f	Client	\N	4cc0bfbd-97e3-4aa2-b98f-e3598b02c8cb	\N	\N	010-5395-3437	\N	\N	yoonahyoung@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:15:02.319487	2026-04-11 08:15:02.319487	\N	f	\N	\N	\N	AhyYO2026!!	\N	f	\N	0	\N	\N	\N	Ahyoung	YOON	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
7ebf071b-cb5e-4a5e-8eab-be41475ce25c	Eunyoung LEE	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	01078355449	\N	\N	clipall@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:50.408466	2026-04-11 08:13:50.408466	\N	f	\N	\N	\N	EunLE2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
04edd426-faf3-41fe-b89c-c8270bc5e223	Youngmi Kim	f	Client	\N	4cc0bfbd-97e3-4aa2-b98f-e3598b02c8cb	\N	\N	010-4181-8797	\N	\N	ym3jm@hanmail.net	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:15:10.554434	2026-04-11 08:15:10.554434	\N	f	\N	\N	\N	YouKi2026!!	\N	f	\N	0	\N	\N	\N	Youngmi	Kim	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
2a7593ce-88a1-4fcf-baf2-08149aa2fc74	JIWON  EOM	f	Client	\N	2cd39131-3cf7-4530-b108-038152c4cae4	\N	\N	010-2551-0776	\N	\N	eumji0ju@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:15:14.576164	2026-04-11 08:15:14.576164	\N	f	\N	\N	\N	JIW E2026!!	\N	f	\N	0	\N	\N	\N	JIWON	EOM	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
ec6407f2-255f-4fc6-9cc4-9ec18a2a0d5f	Aejin CHOI	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	01089743601	\N	\N	choiaejin@hotmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:15:18.537559	2026-04-11 08:15:18.537559	\N	f	\N	\N	\N	AejCH2026!!	\N	f	\N	0	\N	\N	\N	Aejin	CHOI	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
002e5a39-61f4-4cbd-a646-c5c38f073c1d	ThaiStudy HUB	f	Education Agent	\N	626c15b0-bac0-453b-a314-9f1a8adaa81f	\N	\N	+6681 649 7353	+ 6681 925 9523	\N	thaistudyhub@gmail.com	https://thaistudyhub.com/	\N	\N	\N	Thailand	\N	Bangkok	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:05.977836	2026-04-11 08:08:05.977836	\N	f	\N	\N	\N	ThaHU2026!!	\N	f	\N	0	\N	\N	\N	Apple	\N	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/0TzSg9UoWMpqg8y0Uzv7BA/3jKnp4RVlqtP22NehgjU93tnwKsOY53Fx5eOZhGksyXla6epTtTJP-JWzHjiVM0_XBKraOgsyeT5M6dUINuDtfFn0XXXmXPV-n40Y9KkspuDzZLROWZvL6oGy0d6OKoOrKtfVGUAPOCGe6-5QyiajnDm27CCNbfUYD_wojNogiQ/4FzwDSyZRxZ91-V9RenC5n6QOO8fvX4kYXeoy9X-6E8	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
7094106a-4d48-492d-9162-4cd348de4a76	Sung Bae LEE	f	Client	\N	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	+82-10-4621-8943	\N	\N	sbsb5111@gmail.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:09:46.530944	2026-04-11 08:09:46.530944	\N	f	\N	\N	\N	SunBa2026!!	\N	f	\N	0	\N	\N	\N	Sung Bae	LEE	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
e16ca1cc-53ee-4812-bf0f-544225274c20	Kyounghee NOH	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	01044145400	\N	\N	y6917@naver.com	\N	\N	\N	\N	South Korea	\N	Seoul	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:10:42.676937	2026-04-11 08:10:42.676937	\N	f	\N	\N	\N	KyoNO2026!!	\N	f	\N	0	\N	\N	\N	Kyounghee	NOH	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
837e7b3a-8eb5-4b95-9af3-ec755d9ffe85	Hajung LEE	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	withjoine@hanmail.net	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:06.492673	2026-04-11 08:12:06.492673	\N	f	\N	\N	\N	HajLE2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
b9e9fbf3-9932-4e4f-b4fe-52e6c06deee1	Mili KIM	f	Client	\N	4cc0bfbd-97e3-4aa2-b98f-e3598b02c8cb	\N	\N	\N	\N	\N	kml0121@hanmail.net	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:12:14.432034	2026-04-11 08:12:14.432034	\N	f	\N	\N	\N	MilKI2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
ed098be6-3e58-4751-a84a-96896f745400	Minyoung RYU	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	\N	\N	\N	rminyoung@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:02.470924	2026-04-11 08:13:02.470924	\N	f	\N	\N	\N	MinRY2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
8f0c8e20-3f53-4dcf-b25d-482a63f1894f	Mira SAGONG	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	01085291201	\N	\N	mirayam0406@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:13:34.880951	2026-04-11 08:13:34.880951	\N	f	\N	\N	\N	MirSA2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
9206cc30-bbde-4229-8081-508c96b59f02	Ahhyun  SON	f	Client	\N	663b3862-a078-4a55-ad5b-230f8c3331db	\N	\N	01020287558	\N	\N	sonahhyun@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:15:22.564591	2026-04-11 08:15:22.564591	\N	f	\N	\N	\N	Ahh S2026!!	\N	f	\N	0	\N	\N	\N	Ahhyun	SON	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
1ebabbac-963e-4fa5-9835-b0a7d8454e42	Jia CHA	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	01098766305	\N	\N	sk2cha@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:50.000403	2026-04-11 08:14:50.000403	\N	f	\N	\N	\N	JiaCH2026!!	\N	f	\N	0	\N	\N	\N	Jia	CHA	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
36757478-1471-4679-aa01-1681003333c4	Eunyoung LEE	f	Client	\N	b29518df-6fc1-478a-ad90-50f1145ff479	\N	\N	1078355449	\N	\N	clipall@naver.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:15:06.498982	2026-04-11 08:15:06.498982	\N	f	\N	\N	\N	EunLE2026!!	\N	f	\N	0	\N	\N	\N	Eunyoung	LEE	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
2343070a-c4d0-4ec0-b398-7c85b4717b12	Tsz To FANG	f	Client	\N	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	85291000969	\N	\N	doris.fang@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:15:26.479508	2026-04-11 08:15:26.479508	\N	f	\N	\N	\N	TszTo2026!!	\N	f	\N	0	\N	\N	\N	Tsz To	FANG	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
002c4752-f69f-4b92-b18a-ebb7fc83b892	Itara and Jacana Apartments	f	Partner	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:14:53.971824	2026-04-12 16:43:30.099	\N	f	\N	\N	\N	Itaan2026!!	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
632d62d0-ec97-41f9-93b7-eb1e8df595e4	BROWNS English Language School	f	Institute	\N	\N	\N	\N	+61 7 3221 7871	+61 412 012 144	\N	sliang@browns.edu.au	https://brownsenglish.edu.au/	\N	Level 3, 30 Church Lane, Melbourne VIC 3000	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:07:05.000206	2026-04-11 08:07:05.000206	\N	t	institute	partner@browns.com.au	$2a$10$elgQS2QVAJUcAlI0CeY.0.tDcp2u8RKdP8I9tDDcv0aYiHictCmvm	Portal123!	2099-12-31 00:00:00	f	\N	0	\N	\N	\N	Sammy	Liang	\N	\N	https://v5.airtableusercontent.com/v3/u/52/52/1775901600000/QMKGqIKMg_cN9UcsGsRAig/pc3L1vP3a90jSoSvAHQPGbr-jjZNWiY69GnrosaUiDO_a-vSkyo3aNW5eboFI4KgEK4ObvQbsBF_6iLoKCqdK7LqIq9zvqjjgIYLc-6-jl-WZo9TIqur6eu5xGvnsEiWjD67_U7K51o1CWnUCBiuCF77V4i20WXcVfbSGLKNVCo/UxsHZ4vJdw_B-pVrbazGqhnfcoQCw8Sqope7A-VJkdA	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
1605af17-0000-0000-0000-000000000099	Kim Ji-won	f	Client	\N	\N	\N	\N	\N	\N	\N	student@example.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	7b8d3fed-f090-4bdc-ae38-fd5af26f00c9	Active	2026-04-15 10:49:31.106943	2026-04-15 10:49:31.106943	\N	t	student	student@example.com	$2a$10$piF2f.yv8YUnE40lx5LeY.z5PfzlCi7wbWqkFFyViCbOv8oK8h4du	\N	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f
3861f16e-7a7e-436c-9185-355cf1233613	Time Study	f	Agent	\N	\N	\N	\N	+61 3 9670 6692	+61 415 650 101	\N	info@timest.com.au	https://timest.com.au/	\N	\N	\N	Australia	\N	Melbourne	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-11 08:08:01.990034	2026-04-16 06:07:59.107	\N	f	\N	\N	\N	TimSt2026!!	\N	f	\N	0	\N	\N	\N	Jinnie	LEE	\N	\N	data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAQDAwMDAgQDAwMEBAQFBgoGBgUFBgwICQcKDgwPDg4MDQ0PERYTDxAVEQ0NExoTFRcYGRkZDxIbHRsYHRYYGRj/2wBDAQQEBAYFBgsGBgsYEA0QGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCAEAAQADASIAAhEBAxEB/8QAHQABAAMAAwEBAQAAAAAAAAAAAAYHCAECBQQDCf/EAEcQAAEDAgMDBgkICAYDAAAAAAABAgMEBQYHERIhQRMxUWFxkSI3UnJ0gaGxsxQXMkJVgpPTFSM0YmOSosEkJzOywvBDVHP/xAAcAQEAAwEBAQEBAAAAAAAAAAAABQYHBAMCAQj/xAA8EQACAQIDAwkFCAEEAwAAAAAAAQIDBAUGESFBcRIxUXKBkaGx0SI0NWHBExUWMlOy4fAUByMzUkKC8f/aAAwDAQACEQMRAD8A/n+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACUYPwHeMarVLbJ6OFlLspI6pe5Ppa6aaNXoUndLkHVOiRa3EsMT+LYaVZE71c33Ena4NeXUFUo09U9+xebIa9zBh9lN0riqlJc60bfgmU4C6n5At2V2MVLtcNqi3fEIxesmcXWunfUUiU10jbqqtpXKkiInHZcia9jVVT1rYBf0Y8qVJ6fLR+TZ42+aMLry5EKy1+aa80ivAdpI5IZnxSsdHIxVa5jk0VqpzoqcFOpDk+nrtQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABduQX7JfvPg90hcpTWQX7JfvPg90hcpq+XPh1Lt/czDc3/ABet/wCv7UAATZWymM8sM0rKalxTTRtjndIlNU7Kacpq1Va5etNlU16FToKUNIZ0J/lbL6TF71M3mX5ooxp3zcVpqk+02nJVxOthkVN68ltLhs9QACultAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABOsprBHfcxYH1EaPpqFi1T2rzOVFRGJ/MqL6lIKXXkFCzkb7UaJt7ULEXoTw1/wC9hLYFbxr31OEubXXuWv0IHM11K1wytUhz6ad7S+pc2y3yU7hst8lO45Brhg+pwiInMiIcgAAAABURedDjZb5KdxyADjZb5Kdw2W+SnccgDU42W+SncNlvkp3HIA1ONlvkp3DZb5KdxyANTjZb5KdxQ2eOH2UeIKO/08aNZWsWKbRN3KM00VetWrp90vorbO6BkuWscrvpQ1kbmr2tc3+5C5ht41rCprzrauz+Cx5UupW+J0tHsk+S+3+dGZ2ABk5uYAAAAAAAAAAAAAAAAAALbyIusVPf7nZ5Xo11VEyWNFXnVirqidej9fulSH0UNdV224w19BO+Cphcj45Gc7VQ7cOvHZ3MK+munlzPwI3F8PWIWdS1105S2cVtXijZQKXsee8baZkWIrPI6RqaOqKJUXbXzHKmn83qQ9r59cI/Z96/Bi/MNMp5gsKkVL7VLjsMbrZVxSlJxdFv5rRos4Hi4XxPQYtsS3a2xVMUPKOi2ahrWu1TTXmVU039J7RK0qsasFOD1T5iErUZ0KjpVFpJbGgAD0PIA8vEV/o8M4cqL1XxzyU8CtRzYGor12nI1NEVUTnVOJBfn1wj9n3r8GL8w4rnEra2lyK01F8+0krPCLy8g6lvTcop6arpLOBWPz64R+z71+DF+YPn1wj9n3r8GL8w5/vyw/VR1fhrFP0JFnArH59cI/Z96/Bi/MHz64R+z71+DF+YPvyw/VQ/DWKfoSLOBWPz64R+z71+DF+YPn1wj9n3r8GL8wfflh+qh+GsU/QkWcVNntdYosL2+ztenLVFRy6tTyGNVN/rcncp+V1z5trKdUslkqppVRdHVjmxtavBdGq5XJ1ap2lOX2+3PEd7lut2qFmqJN25NGsanM1qcET/ALvUgcex+2nbyt7eXKctmu5Is+WMrXdO7jdXUeTGO1J87e7h07TzgAUA1MAAAAAAAAAAAAAAAAAAAAAAAA0Xkl4sV9Mk9zSxyuMkvFivpknuaWOa/g3uNHqowLMXxOv1mAASZDEIzc8UN086H4zDMhpvNzxQ3TzofjMMyGb5v99j1V5s17IPw6fXf7YgAmWCcubxjGX5Qi/IrY1dH1cjddpehifWX2J08CuW9tVuaipUY6yZb7u8o2dJ1q8uTFbyGoiqqIiaqvAk1qy9xleWNkorDUpE7eks6JC1U6UV+mvqND4cwHhnC8bVt1vY+pTnq6jR8qr1L9X7qISUuVnk/Zrcz7I+r9DPb/8A1AabjZ0tnTL0XqZ8pcjMVTNR1VX2ymTyeUe9ydzdPafemQlz2fCxDSIvVA5f7l6AmI5Xw+K2xb7X9CAnnXFZPVTS4RX11KGmyGvjWr8nvlvevRI17Pcini12TWN6NquhpaStRP8A1509z9k0mD4qZUsJL2U1wfrqelLPGJwftOMuK9NDHlzst3s06Q3a21VG9eblo1ajuxV3L6j4DZlTS0tbSvpqymiqIHpo6KZiPa7tRdylL5i5SwUVDNfcLRubHEm3PQ6q7ZanO5irv3c6t7dOgrmJ5Wq20HVoS5UVzrf/ACW3Bs7UbyoqN1HkSfM9z9PHiU2ACqF5AAAAAAAAAAAAAAAAAAAAANF5JeLFfTJPc0scrjJLxYr6ZJ7mljmv4N7jR6qMCzF8Tr9ZgAEmQxCM3PFDdPOh+MwzIabzc8UN086H4zDMhm+b/fY9VebNeyD8On13+2JKcAYRkxhi2OiermUUKctVSInMxF+ii9Ll3J6136Go6Wlp6KiipKSFkMETUZHGxNEaicyIhXuSlnZQZeLc1a3lrhM5+0nPsMVWNRexUev3iyCz5bw+NtaRqte1Pa+G5d20pucMVneX0qKfsU3ol89779nBAAFhKmAfnPUQUtO+oqZo4YmJq6SRyNa1OlVXmIxV5lYFo37M2I6Vy/wUdMnexFPGtc0aP/LNR4tLzOihZ17j/hpuXBN+RKwRGnzPwHVP2YsRQNX+LHJGne5qHv0F8s11TW2XairNOdIJ2vVO1EU+aV3Qq7KdRPg0z7rWFzQWtWlKPFNeaPvCoipooOkssUFO+eZ7Y442q973LojURNVVToeznOVJt6IyTi23xWrHV2t9O1Gww1UjY2p9Vu1qiepNDxj0sQ3JLxiu5XRuuzU1MkrUXg1XKqJ3aHmmJ3Di6snDm1enDU/o20U1Qgqn5tFrx02gAHidAAAAAAAAAAAAAAAAAABovJLxYr6ZJ7mljlcZJeLFfTJPc0sc1/BvcaPVRgWYvidfrMAAkyGIRm54obp50PxmGZDTebnihunnQ/GYZkM3zf77HqrzZr2Qfh0+u/2xNS5YIxMprKjObknd/KO19pLSAZN3JldlbT0zU0fRTSQO38+rttF7n6eon5ecLmp2dJr/AKryM0xunKniFeMufly8W2AAd5GFGZ8S3X9N22FyypauQ2mImuws207a160bs6dq9KlQGy6uio7hRvpK6lhqYH/SimYj2u7UUhN0yewTcVc6GkqLfI5dpXUkqon8rtUROpEQpWMZauLmvK4ozT13P6f1GjZfzha2drC1uINcnetqfza2PzM1DmXVC47pkLUt232W/RSeTFVxqzve3XX+Ugt6y6xhYkdJV2aaWFv/AJ6b9azTpXZ3onaiFVucGvbbbUpvTpW1eBd7PMOHXjSpVlr0PY+56H52jMDGFkenyO+1T400/U1DuWZonDR2uidmh7uJc3L3iTCaWV1HBROl3VU0Dl/Wt4NRF+inTvXXqTVFr0HlDE7qFN0o1HyXs01/unYe1TBrGpVjXlSjy4vVPTTb2c/aAAcJJgAAAAAAAAAAAAAAAAAAAAGi8kvFivpknuaWOVxkl4sV9Mk9zSxzX8G9xo9VGBZi+J1+swACTIYhGbnihunnQ/GYZkNN5ueKG6edD8ZhmQzfN/vseqvNmvZB+HT67/bEnmVWMYsLYrdT18iMt1ejY5nquiROTXYevUmqovU7XgaVRUc1HNVFRd6KnExcWNgXNe44Zijtl2Y+4WtqI1iIv62BP3VXnT91erRU5j0y9j0bWP8AjXH5dz6P4PLNmV530v8AMtF7e9dOm9fPd8146MB49hxVYMS0yS2a5Q1C6auh12ZGdrF3p28x7BoNOrCrFTpvVPejKq1GpRm6dWLTW57GAAfZ5gAAEWxLl7hjFDHvraBsFW7mq6ZEZJr0rwd60UobGmXd5wdNy0ulXbnu0ZVxt0ROhHp9VfYvBTUR+NXSU1fQy0dZAyenmarJI3pqjkXgpB4pgNvfRckuTPpX16fMsuC5ou8NkoyfKp74v6Pd5GMwSnH+EZMH4ukombT6KZOVpZHcWKv0VXpRd3cvEixl9xQnQqSpVFo1sNqtbmndUo16T1jJaoAA8T3AAAAAAAAAAAAAAAAAANF5JeLFfTJPc0scrjJLxYr6ZJ7mljmv4N7jR6qMCzF8Tr9ZgAEmQxCM3PFDdPOh+MwzIabzc8UN086H4zDMhm+b/fY9VebNeyD8On13+2IB7+D8J1+MMSMtlGqRRtTlJ6hyapEzXeunFd+iJxXoTVUsbEeRkkcaz4XuKy6N30tYqI5V0+q9E01XoVE7SHtsIu7mi61GGsV48OksF5j1jZ1421eppJ9y4vdqU7FLLBM2WGR8cjV1a9iqiovUqEztGa+NrSjWLc0r4mrrsVrOU17Xbne0jd4w9e7BU8heLZU0btVa10jPBeqc+y7md6lU8056de4s5tQk4PtXejrq21pf006kYzjuex9z9C6Ldn25ERt2w8irxkpZtP6XJ/cllsziwTcHtZNV1FA927SqhVE185uqJ6zNYJihmm/pfmkpcV6aFfuclYZW/JFwfyfrqbNpqqmraRlVR1EVRBIm0yWJyOa5OlFTnP1KayEdcVpry13Kfo9HR7G1rs8rv2tnhrps6/dLlNCw28d7bQruOmu7t0MpxjD1h15O1UuVydNvFagAHcRhWed1pZWYAiuaNbytBUNXaVN+w/wVTv2F9Rnk09mzs/M/d9r+Dp28swzCZrm2mo3qa3xTfe19DYsh1ZTw1xl/4yaXcn5tgAFXLoAAAAAAAAAAAAAAAAAAaLyS8WTvTJPc0scq/IupZJgKtpdfDhrXKqdTmN09qKWga9gklKwpNdBgmZIuOJ10/wDswACUIQhGbiL80F17YfjMMyGtMa2iS/Zf3W1woqyywK6NqfWe1Ue1PWrUQyWqKiqipoqcFM7zhTkrqE9zjp3N+qNa/wBP6sXZVKae1S17Glp5M0VkpaY6LLpblsN5Wvne9Xom9WMXYRF7FR6/eLIK3yUu0dblz+jdtvK0E72KxF37D1V6OXtVXp90sguOC8j/AAaPI5uSu/f46mf5i+0+86/2nPyn3bvDQ6TQxVED4J4mSxPTZcx7Uc1ydCovORavyzwNcZklmw9TxuRNP8M50CfysVE9hLAdta2o11pVgpcUmRtveV7Z60KjjwbXkVxPkjgyZ6ujfc4E8mOdqp/U1T96LJnA9Ius1NWVvpFQqf7NksAHGsGsU+V9jHuJCWYMSceS68u/685+FHRUduomUdBSw0tPHrsRQsRjW6rquiJ1rqfuASKSS0XMREpOTbk9WADq97IonSSPaxjUVznOXREROdVU/T8K4zsujKPLptv1asldUMYjVXfss8NV70anrM7EzzLxc3FmMHPpXqtvpEWGm/f3+E/1r7EQhhk+P3sby8lOD1iti7P51N0ythsrDD4U6i0lL2n2/wAaAAEKWIAAAAAAAAAAAAAAAAAAtjIq7tpsT3CzSPa1KyFJY9eL41Xcn3XOX7pfRj2xXepsGJKK8Uv+rTSpJs66bScWr1KmqL2muLbcKS7WimuVDKklPURpJG7qVOPQvBU4KaNlK9VS2du3tg/B/wA6mR57w50buN2l7M1t4rZ5aeJ9QALYUUGf82sAy2i6y4ltcCut1S/anYxP2eRePmuXjwVdOKGgDpLFFPA+CeNkkT2q17Hpq1yLuVFRedCNxTDaeIUXSnse59D/ALzkvgmMVcKuFWp7U9jXSvXoZk7COLLjg/ELLnQaSMVNieneujZma7014LxReC9KaoulMMYzsGLKNJbVWN5ZE1kpZdGyx83O3im9N6ap1laY1yXfyslywgrVavhOt8jtNP8A5uX/AGr38Cop6a42e58lUw1NDVwu10eixvYvBU4p2lLt7u+wGbpVoawfd2P6eBot1YYbmeCr28+TVS7eElv4rvZsgGZLTmzja1NZGtybXxN+pWs5RV7XbnL3kpo8+7gxNLhh2mmXpgndF7FRxYaOarGovbbjxXpqVO5yPidJ/wC2lNfJ6eeheQKeZn5Qr/qYbqG+bUov/FDs7Pu3IngYdqlXrnan9jr/ABFh36vg/Q4fwni3N9i++PqW+Ck6rPyVY1Siwyxj+DpqpXJ3I1PeRm6Zy40uDVZTz0tuYqaKlLDvX1v2lRezQ562abCmvZk5cE/roddvknFKr9uKjxa+mpoO73u02GgWtvFfBRwpzOkdvcvQ1Ody9SIqlC5gZqVWJo5LTZWy0lqXc9zt0lR26fRb1cePQlfVtfXXKrdVXCsnq53c8s8ivcvrU+cqmKZlrXkXSpLkQfe+0vGCZOt7CSrVny5rm6FwXT833IAArRcQAAAAAAAAAAAAAAAAAAAAAWvlBjxtqrEwvdptKOofrSyvduhkXnavQ1y9y9qqlUA7LC9qWVaNanzrxXQR+J4dSxG3lb1uZ7+h7mv78jaQKWy3zYYyOGwYqqNNNGU9wkXdpwbIv/Lv6S6EVHNRzVRUVNUVOJrGH4jRvqX2lJ8VvXEwzFcJuMMrOjXXB7mulf3YcgA7iMB8F1slovlL8nu9upqyPgkrEVW9i86eo+8HzOEZrkyWqPunUlTkpwejW9FZXXI/C9Yrn22qrbc9V3NRySsT1O3/ANRGKvIW6Mf/AIDEFJM3+PE6NfYri9AQ9bL2H1Xq6ej+Ta8FsLBb5sxWgtFW1XzSfi1r4mWMX5fX3BkMFRcXU09NM7YbPTuVWo7TXZXVEVF0RV9RFDVWYtqZeMs7tTubtPigWoj6UdH4W7t0VPWZVKJj+GQsLhRpflktV9TTcrYzUxS1c6354vR6d6f96AACCLMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACc4MzQveFEZRT63C2Ju+Tyu0dGn7juHYu7s5yDA6La6q2s1Uoy0Zy3llQvabo3EVKL/ALs6Ow1hhrHGHMVQp+i69qVGmrqSbwJW/d49qaoSIxex745GyRvcx7V1a5q6Ki9KE4sObWL7I1kM1Wy507dE5OtRXOROp6aO17VXsLrY5vg0o3cdH0r0/wDpnOJ5Bmm52M9V0S5+x+unE0wCrLRnnh6r2I7vb6u3SKuivZpNG3r1TR39KkxoMeYNuULZKXElvTaXZRs0qQvVfNfovsLLb4rZ3C/26qfbo+57SnXWB39q9KtGS+emq71qiRA6seyRiPje17VTVHNXVFOxIEUfBfHsjwvcpJNNhtLKrtejYXUx4aKzaxlQ2nCdTYaapZJcq1nJOiY7VYo1+krujVNyJx114GdTOs3XMKlxClB6uK28XuNbyFZ1KNrUrTWim1pwW/x8AACpF7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOzJJIpEfG9zHJzOauioffJf77NT/J5b1cZItNOTdUvVunRpqecD7jUlHZF6HxKlCbTkkwAD4PsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//Z	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f	f
18c1a739-86a0-404d-80e1-a7012eb128e1	Test Agent Co	f	Agent	\N	\N	\N	\N	\N	\N	\N	agent@testagency.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	58893164-afce-40ff-9233-3e229172498b	Active	2026-04-15 01:33:41.199555	2026-04-15 01:33:41.199555	\N	t	consultant	agent@testagency.com	$2a$10$B/4/ZuGcGLsCmgXQMqpx9O9.gTaKJNzG9.g1zJxX/GeyhFnJ.yyra	Portal123!	2099-12-31 00:00:00	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f
1605af17-a158-4315-827c-472d33656a5f	Ji Young CHOI	f	Client	\N	\N	\N	\N	\N	\N	\N	student@example.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	7b8d3fed-f090-4bdc-ae38-fd5af26f00c9	Active	2026-04-15 10:56:24.630378	2026-04-15 10:56:24.630378	\N	t	student	student@example.com	$2a$10$piF2f.yv8YUnE40lx5LeY.z5PfzlCi7wbWqkFFyViCbOv8oK8h4du	\N	\N	f	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f
\.


ALTER TABLE myagency.accounts ENABLE TRIGGER ALL;

--
-- Data for Name: agent_commission_configs; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.agent_commission_configs DISABLE TRIGGER ALL;

COPY myagency.agent_commission_configs (id, partner_id, school_id, commission_type, default_rate, default_amount, default_base, payment_method, payment_timing, notes, valid_from, valid_to, status, created_on, modified_on) FROM stdin;
\.


ALTER TABLE myagency.agent_commission_configs ENABLE TRIGGER ALL;

--
-- Data for Name: application_form_partners; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.application_form_partners DISABLE TRIGGER ALL;

COPY myagency.application_form_partners (id, form_id, partner_account_id, partner_parameter, display_name, email_notification, partner_email_override, is_active, created_on, modified_on) FROM stdin;
\.


ALTER TABLE myagency.application_form_partners ENABLE TRIGGER ALL;

--
-- Data for Name: application_forms; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.application_forms DISABLE TRIGGER ALL;

COPY myagency.application_forms (id, name, slug, description, visibility, redirect_url, source_form_id, organisation_id, created_by, status, created_on, modified_on, form_type) FROM stdin;
52e23384-7810-4c33-a780-10ae6b43a72a	2026 July Camp Application	2026-july-camp-application	\N	private	\N	\N	\N	30063c30-90e9-40d4-9b07-420065659873	active	2026-04-12 16:21:54.13946	2026-04-12 16:21:54.13946	camp_application
\.


ALTER TABLE myagency.application_forms ENABLE TRIGGER ALL;

--
-- Data for Name: application_grade; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.application_grade DISABLE TRIGGER ALL;

COPY myagency.application_grade (id, application_id, participant_id, enrollment_spot_id, grade_label, created_at) FROM stdin;
\.


ALTER TABLE myagency.application_grade ENABLE TRIGGER ALL;

--
-- Data for Name: application_participants; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.application_participants DISABLE TRIGGER ALL;

COPY myagency.application_participants (id, application_id, participant_type, sequence_order, full_name, full_name_native, date_of_birth, gender, nationality, passport_number, passport_expiry, grade, school_name, english_level, medical_conditions, dietary_requirements, special_needs, relationship_to_student, is_emergency_contact, email, phone, whatsapp, line_id, created_at, updated_at, first_name, last_name, english_name, camp_application_id, guardian_consent_given, guardian_consent_at, guardian_email, guardian_phone) FROM stdin;
\.


ALTER TABLE myagency.application_participants ENABLE TRIGGER ALL;

--
-- Data for Name: applications; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.applications DISABLE TRIGGER ALL;

COPY myagency.applications (id, application_number, agent_id, client_id, package_group_id, package_id, preferred_start_date, status, total_children, total_adults, primary_language, referral_source, referral_agent_code, special_requests, terms_accepted, terms_accepted_at, notes, created_at, updated_at, application_type, service_types, application_status, quote_id, contact_id, account_id, assigned_staff_id, applicant_name, applicant_email, applicant_phone, applicant_nationality, flight_number, flight_date, arrival_time, departure_airport, arrival_airport, passenger_count, checkin_date, checkout_date, room_type, num_rooms, accommodation_address, destination_country, study_start_date, study_end_date, institution_name, course_name, internship_start_date, internship_end_date, industry, company_preference, settlement_date, suburb, settlement_notes, guardian_start_date, guardian_end_date, student_name_for_guardian, guardian_type, first_name, last_name, english_name, original_name, agent_account_id, is_active, signature_image) FROM stdin;
\.


ALTER TABLE myagency.applications ENABLE TRIGGER ALL;

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.audit_logs DISABLE TRIGGER ALL;

COPY myagency.audit_logs (id, table_name, record_id, action, changed_by, changed_by_email, changed_by_role, old_values, new_values, changed_fields, ip_address, user_agent, created_at) FROM stdin;
\.


ALTER TABLE myagency.audit_logs ENABLE TRIGGER ALL;

--
-- Data for Name: banking; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.banking DISABLE TRIGGER ALL;

COPY myagency.banking (id, bank_name, account_number, account_holder, bank_code, country_code, default_currency, is_primary, status, created_at, updated_at, organisation_id, account_name, bsb, swift_code, notes, account_entity, bank_address) FROM stdin;
\.


ALTER TABLE myagency.banking ENABLE TRIGGER ALL;

--
-- Data for Name: camp_application_contacts; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.camp_application_contacts DISABLE TRIGGER ALL;

COPY myagency.camp_application_contacts (id, camp_application_id, contact_id, role, created_at) FROM stdin;
836b914c-ff29-42ef-83b6-969c5403e736	3249845a-0d31-4074-99df-41778edb8f9a	f2e92036-c636-4339-a9d5-996f9e641fc9	adult	2026-04-11 08:56:46.55777
b2044c87-19d7-419c-9977-348c29d91e3d	e4a7c62d-06b6-4b9f-aa44-28c45ff4bea0	c5b1d3b1-a2c8-4399-80fb-ed3eaa4b5e32	adult	2026-04-11 08:56:54.254606
2ac74e4e-5076-4917-92c0-50a86beefd71	3e6288f4-b484-4bd8-9c8d-f31bd8435ba4	57814348-a665-4cfb-bfd5-e36f9684049a	adult	2026-04-11 08:57:01.806755
415a1c52-4aa3-4343-8efd-3fbb1e050a17	7c1001ee-2823-4b7a-aa4f-724debacfe1e	8fd53a1a-6136-420c-bf40-e3fb0a63e13e	adult	2026-04-11 08:57:09.660576
0c28a371-b56c-46d1-a88d-22a5c04f488d	7c1001ee-2823-4b7a-aa4f-724debacfe1e	49babc36-f265-4612-8822-b94385e0d62d	adult	2026-04-11 08:57:17.6039
e1d26cfb-59f2-4eea-b6c8-f15a2c37d62f	81b47002-e0c5-4262-9cc3-6dbdf52c0964	680d2388-fb91-490e-8533-4ae94008a832	child	2026-04-11 08:57:44.275185
87af9317-139e-4a6f-975d-123a6d4c2a37	b161e28d-7083-4a0a-a544-84330d82b771	fe9fc2c7-60a1-4414-95c4-6eeb76408d7a	child	2026-04-11 08:57:52.322571
ab00f9fb-86d9-4023-9dcb-06f1aabaf9bd	b161e28d-7083-4a0a-a544-84330d82b771	c6b2d0ab-b0ce-42ff-940a-2facf372546c	child	2026-04-11 08:58:00.124021
8a98b771-09c6-4870-bc56-fd8a559daa9f	b161e28d-7083-4a0a-a544-84330d82b771	d1def206-790f-48dd-bfee-a5ebadb8490a	child	2026-04-11 08:58:07.94223
36fe86ec-147c-45e0-a409-03a09d8c3bd5	b9b71e06-3bd0-4594-a3b6-43609d12405f	be1c016d-0db9-4ec5-948c-06c57ea54c38	child	2026-04-11 08:58:15.852712
7508142c-2714-4f8d-9e03-6bfb26614064	59e46538-3b62-4850-93c4-4e94273d4e7d	1c3711d2-9f6f-41b7-8f15-ce0638927e60	child	2026-04-11 08:58:23.569894
c4142ca1-40dd-4187-b17c-1ec453a43b31	887aeb90-8f28-4908-98ad-d1b73a9a5014	7d0e21bc-d259-43a7-ba7c-0b21ab566f0e	child	2026-04-11 08:58:31.510476
7d2ffe7d-0436-47a4-8961-c6815b0029d4	f1c14431-49ce-47d9-ad44-52f9c87a43a4	7fef9652-889b-490d-85a6-88b11d2319db	child	2026-04-11 08:58:39.128716
64c21ee3-8886-4638-987d-257947dd8115	eb36728e-ef92-4e3a-974a-d7163ea438ac	c337984a-b91a-4773-8ca5-958151cd3699	child	2026-04-11 08:58:46.916705
2d374967-f067-44d2-ae92-f95f3ef84fb8	1ddce433-584f-4546-b905-7b9717fb6008	d4e17d07-f429-45f3-be48-31a3f09ef3d1	child	2026-04-11 08:58:54.870909
b419fa41-263b-4488-b7e6-0c0e9cf1b50e	87321865-3f51-4cbb-bf10-ba37f98a05c0	09b3bef0-936c-440e-b05c-5d9479c09c06	child	2026-04-11 08:59:02.749534
d35567a5-305d-46fa-bcfc-f5e6b4beba43	87321865-3f51-4cbb-bf10-ba37f98a05c0	0e124f0e-4b6d-445e-931c-fd44a029681a	child	2026-04-11 08:59:10.414732
39f2d310-2db1-42f8-8d36-1a0b43f5da12	577673ab-326e-46f7-94f1-d69757460565	17c7f392-a05e-4ed8-896d-0d19f0b6aadd	child	2026-04-11 08:59:18.181951
84c1324d-33ab-4642-a88d-d7ecb47992d4	4d950a95-4e50-462e-bb51-f8c67c3e7cf3	25e56e64-c532-49b7-b98c-d2352b1b6b60	child	2026-04-11 08:59:25.772351
05995ee8-10fc-4955-a274-ad377fc2acd8	2fc14f4d-0925-4833-a445-1c46e105d942	ddc2853e-0286-46d7-a57a-d6ffdd88294b	child	2026-04-11 08:59:33.782625
691d725e-acaf-4bf6-818d-54043cdf87f2	2fc14f4d-0925-4833-a445-1c46e105d942	ce5df9e7-8569-4415-95c6-966b82f7f834	child	2026-04-11 08:59:41.298252
ee4b58ca-496a-4f10-be1c-1ddf8e30a3f9	87c97736-62e4-492a-9993-41ea65f9efe3	9670188b-fa48-424f-81ae-666411e7f4bd	child	2026-04-11 08:59:49.159929
1772da24-76b6-4f41-8be7-211295e72c3d	87c97736-62e4-492a-9993-41ea65f9efe3	e8766d95-5ea1-47ef-8d11-2256cff402da	child	2026-04-11 08:59:57.100434
f027e75e-87d6-4c57-8022-ddf07a69824b	b336032b-65f3-4ae8-b135-c36161f5f0e3	2aa8ca94-bbf9-403a-af42-a7bf92541a48	child	2026-04-11 09:00:05.016172
18151cef-e765-4d77-b569-d66007c93ed5	64280bf3-118e-49d8-a3f1-2f22a1149374	dd2c669f-619a-448d-b0ab-47ac4e225bfc	child	2026-04-11 09:00:12.839562
0e783f1b-716f-41ea-988b-d5ed0835e8ad	64280bf3-118e-49d8-a3f1-2f22a1149374	0ef9dc34-6692-4170-aec3-bcc0701d8d4c	child	2026-04-11 09:00:20.683886
28aeb2d7-2bdf-42ba-b761-c9a59288fb20	3249845a-0d31-4074-99df-41778edb8f9a	4129eb7d-4231-4873-9b45-a75476849057	child	2026-04-11 09:00:28.461497
4b2d83b1-0be2-4437-a7fd-e467a4485a66	e4a7c62d-06b6-4b9f-aa44-28c45ff4bea0	b8191cf6-fda6-469e-abc0-d87f706b07a7	child	2026-04-11 09:00:44.447527
e652d54c-94bc-487b-85d0-5de99b6444b0	e9f1d58a-48e2-4b44-935f-490c731d6e2e	f3aedd86-1be0-46a6-87f0-ef3e1c3eb4ab	child	2026-04-11 09:00:56.245782
8d061bc0-87b6-45bb-97a7-b3cee0b469ff	981d81a6-09c1-4608-b5ec-0606804118a2	e6f12150-2712-4a49-a9dc-2b9cf0f3f5b5	child	2026-04-11 09:01:03.865941
808c8157-c33c-4b81-a0e2-f36d885bbe7b	981d81a6-09c1-4608-b5ec-0606804118a2	a6b0e8d5-059c-4594-974e-d154f4fa8316	child	2026-04-11 09:01:11.712994
a5b3488b-49d4-4431-ae9e-9c9e325c5748	3e6288f4-b484-4bd8-9c8d-f31bd8435ba4	fea18c58-9e29-47a4-92b9-3b621a771358	child	2026-04-11 09:01:19.621795
facef74d-8997-4965-893a-8bf7d8d57994	3e6288f4-b484-4bd8-9c8d-f31bd8435ba4	a56ecf30-d1f7-4d0d-a9cd-630e407f5c01	child	2026-04-11 09:01:27.486619
7aac92ba-b3f0-4c65-a504-2be49aae7494	c8a46edb-1da2-4634-87d8-c2c5004ee73e	62762865-d527-473e-bfed-f6eaf77205a0	child	2026-04-11 09:01:35.464246
f9af4aae-a85c-45e2-96ed-84847c89db55	7c1001ee-2823-4b7a-aa4f-724debacfe1e	7ec82176-6877-4a1f-923f-a2052c552889	child	2026-04-11 09:01:43.362568
\.


ALTER TABLE myagency.camp_application_contacts ENABLE TRIGGER ALL;

--
-- Data for Name: camp_applications; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.camp_applications DISABLE TRIGGER ALL;

COPY myagency.camp_applications (id, application_ref, package_group_id, package_id, applicant_name, applicant_email, applicant_phone, applicant_nationality, applicant_dob, adult_count, student_count, preferred_start_date, special_requirements, dietary_requirements, medical_conditions, emergency_contact_name, emergency_contact_phone, lead_id, contract_id, assigned_staff_id, agent_account_id, application_status, status, created_at, updated_at, quote_id, quoted_at, applicant_first_name, applicant_last_name, applicant_original_name, applicant_english_name, signature_image, signature_date, notes, street_address, street_address_2, applicant_city, applicant_state, postal_code, applicant_country, program_city, guardian_consent_given, guardian_consent_at, guardian_email, guardian_phone) FROM stdin;
e9f1d58a-48e2-4b44-935f-490c731d6e2e	2026 Jul-Townsville_The Cathedral School -A Package 1 Adult / 1 Child-Jieun Suh	f3da2590-9971-4c62-aa79-5906024e16d2	914feb38-4fa6-4c3f-b9e7-e8e4be24edca	Jieun Suh	grit31@naver.com	01082081916	\N	\N	1	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	submitted	Active	2026-04-11 08:56:03.777463	2026-04-11 08:56:03.777463	\N	\N	Jieun	Suh	서지은	\N	\N	\N	Package Group: 2026 Jul-Townsville_The Cathedral School\nPackage: 2026 Jul-Townsville_The Cathedral School -A Package 1 Adult / 1 Child\nInstitute: The Cathedral School\nAccommodation: Jacana Apartments	중앙공원로 54	\N	성남시	경기도	12345	대한민국	Townsville	f	\N	\N	\N
c8a46edb-1da2-4634-87d8-c2c5004ee73e	2026 Aug-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child-Ahhyun  Son	3b3673f3-6fe8-4b28-9a8d-3f176df12409	9ff49453-5697-4b9a-bc8a-06ef6d2eedbc	Ahhyun  Son	sonahhyun@naver.com	01020287558	\N	\N	1	1	\N	\N	\N	\N	\N	\N	\N	27a7de5a-55cc-420f-bbb3-d39a985828a9	\N	\N	confirmed	Active	2026-04-11 08:56:15.559689	2026-04-11 08:56:15.559689	\N	\N	Ahhyun	Son	손아현	\N	\N	\N	Package Group: 2026 Aug-Melbourne_Oakleigh Schooling\nPackage: 2026 Aug-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child\nInstitute: Oakleigh Grammar\nAccommodation: Punthill Oakleigh\nHeard via: Jongno International Education Agency	124-304, 12, Imun-ro 35-gil, Dongdaemun-gu	\N	Dongdaemun-gu	Seoul	02404	South Korea	Melbourne	f	\N	\N	\N
7c1001ee-2823-4b7a-aa4f-724debacfe1e	2026 Aug-Melbourne_Oakleigh Schooling-C Package 2 Adult / 1 Child-Aejin CHOI	3b3673f3-6fe8-4b28-9a8d-3f176df12409	c84d5826-919b-443e-9fe4-15eb85b4ca98	Aejin CHOI	choiaejin@hotmail.com	01089743601	\N	\N	2	1	\N	\N	\N	\N	\N	\N	\N	d440f5c0-aa75-4c7b-afab-673a3168f07e	\N	\N	confirmed	Active	2026-04-11 08:56:19.462647	2026-04-11 08:56:19.462647	\N	\N	Aejin	CHOI	최애진	\N	\N	\N	Package Group: 2026 Aug-Melbourne_Oakleigh Schooling\nPackage: 2026 Aug-Melbourne_Oakleigh Schooling-C Package 2 Adult / 1 Child\nInstitute: Oakleigh Grammar\nAccommodation: Punthill Oakleigh\nHeard via: Internet	전망길 26, 301호	\N	원주시	강원특별자치도	26379	한국	Melbourne	f	\N	\N	\N
3e6288f4-b484-4bd8-9c8d-f31bd8435ba4	2026 Aug-Melbourne_Oakleigh Schooling-D Package 2 Adult / 2 Child-Tsz To FANG	3b3673f3-6fe8-4b28-9a8d-3f176df12409	3af34501-8aeb-416c-bf2d-028f18d684fc	Tsz To FANG	doris.fang@gmail.com	85291000969	\N	\N	2	2	\N	\N	\N	\N	\N	\N	\N	e5cf9530-24d2-435d-8b2b-9f70bf75d7ab	\N	\N	confirmed	Active	2026-04-11 08:56:11.623267	2026-04-11 08:56:11.623267	\N	\N	Tsz To	FANG	Wing Tung, PANG	\N	\N	\N	Package Group: 2026 Aug-Melbourne_Oakleigh Schooling\nPackage: 2026 Aug-Melbourne_Oakleigh Schooling-D Package 2 Adult / 2 Child\nInstitute: Oakleigh Grammar\nAccommodation: Punthill Oakleigh	Flat A, 7/F, Wellgan Villa, 148 Nga Tsin Wai Road	\N	Kowloon City	Kowloon	0000	Hong Kong	Melbourne	f	\N	\N	\N
981d81a6-09c1-4608-b5ec-0606804118a2	2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child-JIWON  EOM	3eda0426-7947-4640-a1fb-7f380179433d	c8093fc3-9ffe-4238-a112-e86c7300f358	JIWON  EOM	eumji0ju@gmail.com	010-2551-0776	\N	\N	1	2	\N	\N	\N	\N	\N	\N	\N	bfc32694-5d78-4a94-aebb-87902d57154d	\N	\N	confirmed	Active	2026-04-11 08:56:07.71611	2026-04-11 08:56:07.71611	\N	\N	JIWON	EOM	엄지원	\N	\N	\N	Package Group: 2026 Jul-Melbourne_Oakleigh Schooling\nPackage: 2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child\nInstitute: Oakleigh Grammar\nAccommodation: Punthill Oakleigh\nHeard via: Lime Education	서울시 강남구 삼성로 212 은마아파트 22동 1006호	\N	서울	서울	06284	서울	Melbourne	f	\N	\N	\N
87c97736-62e4-492a-9993-41ea65f9efe3	2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child-Min A LEE	3eda0426-7947-4640-a1fb-7f380179433d	c8093fc3-9ffe-4238-a112-e86c7300f358	Min A LEE	mj212522@gmail.com	1071566577	\N	\N	1	2	\N	\N	\N	\N	\N	\N	\N	3c7871d3-6722-446b-bcc6-39722b7e443d	\N	\N	confirmed	Active	2026-04-11 08:55:44.262228	2026-04-11 08:55:44.262228	\N	\N	Min A	LEE	이민아	\N	\N	\N	Package Group: 2026 Jul-Melbourne_Oakleigh Schooling\nPackage: 2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child\nInstitute: Oakleigh Grammar\nAccommodation: Punthill Oakleigh	부산시 해운대구 마린시티 1로 167, B/1101	\N	부산	부산	48092	South Korea	Melbourne	f	\N	\N	\N
b336032b-65f3-4ae8-b135-c36161f5f0e3	2026 Jul-Melbourne_Browns English Camp-A Package 1 Adult / 1 Child-Jia CHA	96c936cc-d3a1-4fb2-8d09-843c9350e64f	817dd990-91ff-4843-b881-ed3679d8caec	Jia CHA	sk2cha@naver.com	01098766305	\N	\N	1	1	\N	\N	\N	\N	\N	\N	\N	3cda3dcc-2c4b-46fb-90b4-4836227db98c	\N	\N	confirmed	Active	2026-04-11 08:55:48.266245	2026-04-11 08:55:48.266245	\N	\N	Jia	CHA	차지아	\N	\N	\N	Package Group: 2026 Jul-Melbourne_Browns English Camp\nPackage: 2026 Jul-Melbourne_Browns English Camp-A Package 1 Adult / 1 Child\nInstitute: BROWNS English Language School\nAccommodation: Brady Hotel Flinders\nHeard via: 네이버 검색	345, Dongdaegu-ro, Suseong-gu	\N	Daegu	\N	42013	Republic of Korea	Melbourne	f	\N	\N	\N
4d950a95-4e50-462e-bb51-f8c67c3e7cf3	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child-Hyeonhye HEO	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	9f59733a-d10b-453c-9291-e4a6a250236d	Hyeonhye HEO	erinheo@gmail.com	1098110270	\N	\N	1	1	\N	\N	\N	\N	\N	\N	\N	a82d9619-f105-405d-a1c7-5d51c4b1dcfc	\N	\N	confirmed	Active	2026-04-11 08:55:36.391748	2026-04-11 08:55:36.391748	\N	\N	Hyeonhye	HEO	허현혜	\N	\N	\N	Package Group: 2026 Jul-Melbourne_Collingwood Schooling\nPackage: 2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child\nInstitute: Collingwood College\nAccommodation: Brady Hotel Hardware	이문로150 이문아이파크자이 209동 1105호	\N	서울	서울	2414	South Korea	Melbourne	f	\N	\N	\N
1ddce433-584f-4546-b905-7b9717fb6008	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child-Hyewon JEONG	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	9f59733a-d10b-453c-9291-e4a6a250236d	Hyewon JEONG	twinkle0826@naver.com	1084843467	\N	\N	1	1	\N	\N	\N	\N	\N	\N	\N	c2cf71a6-8877-40f1-8685-16c7fd32e805	\N	\N	confirmed	Active	2026-04-11 08:55:24.493355	2026-04-11 08:55:24.493355	\N	\N	Hyewon	JEONG	정혜원	\N	\N	\N	Package Group: 2026 Jul-Melbourne_Collingwood Schooling\nPackage: 2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child\nInstitute: Collingwood College\nAccommodation: Brady Hotel Hardware	101-1203	\N	대전	대전로340번길15	34698	South Korea	Melbourne	f	\N	\N	\N
887aeb90-8f28-4908-98ad-d1b73a9a5014	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child-Jia CHA	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	9f59733a-d10b-453c-9291-e4a6a250236d	Jia CHA	sk2cha@naver.com	1098766305	\N	\N	1	1	\N	\N	\N	\N	\N	\N	\N	eed783de-f7e2-4c03-8329-4499ccc5d534	\N	\N	confirmed	Active	2026-04-11 08:55:12.813922	2026-04-11 08:55:12.813922	\N	\N	Jia	CHA	차지아	\N	\N	\N	Package Group: 2026 Jul-Melbourne_Collingwood Schooling\nPackage: 2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child\nInstitute: Collingwood College\nAccommodation: Brady Hotel Hardware	101-705, Beomeo Station Ubang Usell, 345, Dongdaegu-ro	\N	Daegu	\N	42013	South Korea	Melbourne	f	\N	\N	\N
81b47002-e0c5-4262-9cc3-6dbdf52c0964	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child-Taewon GU	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	9f59733a-d10b-453c-9291-e4a6a250236d	Taewon GU	gtw0107@naver.com	1022090050	\N	\N	1	1	\N	\N	\N	\N	\N	\N	\N	a89cbc95-af8a-42b5-b5af-7dcc28e764c6	\N	\N	confirmed	Active	2026-04-11 08:54:57.218326	2026-04-11 08:54:57.218326	\N	\N	Taewon	GU	구태원	\N	\N	\N	아이들의 얼굴이 나온 사진게시는 원하지 않습니다.\nPackage Group: 2026 Jul-Melbourne_Collingwood Schooling\nPackage: 2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child\nInstitute: Collingwood College\nAccommodation: Brady Hotel Hardware	110-1502, 50, Arisu-ro 50-gil	\N	Gangdong-gu	Seoul	5229	South Korea	Melbourne	f	\N	\N	\N
f1c14431-49ce-47d9-ad44-52f9c87a43a4	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child-Uiji JO	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	9f59733a-d10b-453c-9291-e4a6a250236d	Uiji JO	112jo@naver.com	1047171504	\N	\N	1	1	\N	\N	\N	\N	\N	\N	\N	a3e30696-0225-483e-a287-752aeeb9a200	\N	\N	confirmed	Active	2026-04-11 08:55:16.847319	2026-04-11 08:55:16.847319	\N	\N	Uiji	JO	조의지	\N	\N	\N	1 Adult & 1 Child\t3 Weeks\t$9,900\t1\t$9,900\nGrade 2 to Grade 10_Weekly\t1 Weeks\t$1,000\t3\t$3,000\nExtra Night - 1  Bedroom\tPer Night\t$175\t21\t$3,675\n2026 July Melbourne Schooling Total Fee_AUD $16,575\n$1,400 + $300 = $1,700\nPackage Group: 2026 Jul-Melbourne_Collingwood Schooling\nPackage: 2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child\nInstitute: Collingwood College\nAccommodation: Brady Hotel Hardware	선유로43가길24 거성파스텔아파트	\N	서울시	영등포구	7210	South Korea	Melbourne	f	\N	\N	\N
87321865-3f51-4cbb-bf10-ba37f98a05c0	2026 Jul-Melbourne_Collingwood Schooling-B Package 1 Adult / 2 Child-Eunyoung LEE	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	2c672385-36c5-41f1-9b0d-a7fcf683c5dd	Eunyoung LEE	clipall@naver.com	1078355449	\N	\N	1	2	\N	\N	\N	\N	\N	\N	\N	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	\N	confirmed	Active	2026-04-11 08:55:28.451969	2026-04-11 08:55:28.451969	\N	\N	Eunyoung	LEE	이은영	\N	\N	\N	Package Group: 2026 Jul-Melbourne_Collingwood Schooling\nPackage: 2026 Jul-Melbourne_Collingwood Schooling-B Package 1 Adult / 2 Child\nInstitute: Collingwood College\nAccommodation: Brady Hotel Hardware	1802, 12b/D, Fugui East Road229nong, Ancient International Plaza	\N	Shanghai	Shanghai	200000	China	Melbourne	f	\N	\N	\N
3249845a-0d31-4074-99df-41778edb8f9a	2026 Jul-Melbourne_Collingwood Schooling-C Package 2 Adult / 1 Child-Jung Won SA	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	bd9b1677-580c-48dd-812e-7d2a8817a69b	Jung Won SA	harky00@naver.com	01064585537	\N	\N	2	1	\N	\N	\N	\N	\N	\N	\N	461c6292-fb62-41f1-840a-d8dcb94a2a89	\N	\N	confirmed	Active	2026-04-11 08:55:56.115836	2026-04-11 08:55:56.115836	\N	\N	Jung Won	SA	사정원	\N	\N	\N	Package Group: 2026 Jul-Melbourne_Collingwood Schooling\nPackage: 2026 Jul-Melbourne_Collingwood Schooling-C Package 2 Adult / 1 Child\nInstitute: Collingwood College\nAccommodation: Brady Hotel Hardware	202-1105, 72, Ttukseom-ro 56-gil, Gwangjin-gu	\N	Seoul	\N	05108	South Korea	Melbourne	f	\N	\N	\N
b161e28d-7083-4a0a-a544-84330d82b771	2026 Jul-Melbourne_Collingwood Schooling-D Package 2 Adult / 2 Child-Miyoung AN	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	5909ec58-1a91-4265-ad3b-f97df4900633	Miyoung AN	mmyung00@gmail.com	1020839552	\N	\N	1	3	\N	\N	\N	\N	\N	\N	\N	d76bea55-68fa-4a62-a537-a94a16902391	\N	\N	confirmed	Active	2026-04-11 08:55:01.176525	2026-04-11 08:55:01.176525	\N	\N	Miyoung	AN	안미영	\N	\N	\N	Package Group: 2026 Jul-Melbourne_Collingwood Schooling\nPackage: 2026 Jul-Melbourne_Collingwood Schooling-D Package 2 Adult / 2 Child\nInstitute: Collingwood College\nAccommodation: Brady Hotel Hardware	서울특별시 강남구 압구정로39길 58 현대아파트 61동	\N	서울	강남	6004	South Korea	Melbourne	f	\N	\N	\N
b9b71e06-3bd0-4594-a3b6-43609d12405f	2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child-Jihye YANG	3eda0426-7947-4640-a1fb-7f380179433d	2f1f35b2-ab89-4052-ac66-63d1e8661c5d	Jihye YANG	jihye0709@gmail.com	1091138315	\N	\N	1	1	\N	\N	\N	\N	\N	\N	\N	20b6c86c-3c39-48be-a9ed-fcce5ab702c6	\N	\N	confirmed	Active	2026-04-11 08:55:05.079567	2026-04-11 08:55:05.079567	\N	\N	Jihye	YANG	양지혜	\N	\N	\N	Package Group: 2026 Jul-Melbourne_Oakleigh Schooling\nPackage: 2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child\nInstitute: Oakleigh Grammar\nAccommodation: Punthill Oakleigh	Sampung APT 8-1103, Seocho Jungang-ro 200, Seocho-gu	\N	Seoul	\N	6601	South Korea	Melbourne	f	\N	\N	\N
eb36728e-ef92-4e3a-974a-d7163ea438ac	2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child-Kahyun KIM	3eda0426-7947-4640-a1fb-7f380179433d	2f1f35b2-ab89-4052-ac66-63d1e8661c5d	Kahyun KIM	izzyggu0984@gmail.com	1068789025	\N	\N	1	1	\N	\N	\N	\N	\N	\N	\N	ee54ee4c-5adf-4a40-acda-403c1bfced50	\N	\N	confirmed	Active	2026-04-11 08:55:20.723449	2026-04-11 08:55:20.723449	\N	\N	Kahyun	KIM	김가현	\N	\N	\N	Package Group: 2026 Jul-Melbourne_Oakleigh Schooling\nPackage: 2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child\nInstitute: Oakleigh Grammar\nAccommodation: Punthill Oakleigh	118dong 1202ho, 55, Sangil-ro, Gangdong-gu	\N	SEOUL	\N	5275	South Korea	Melbourne	f	\N	\N	\N
577673ab-326e-46f7-94f1-d69757460565	2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child-Kyungmi SON	3eda0426-7947-4640-a1fb-7f380179433d	2f1f35b2-ab89-4052-ac66-63d1e8661c5d	Kyungmi SON	skyward14@naver.com	1093686560	\N	\N	1	1	\N	\N	\N	\N	\N	\N	\N	af574d96-22a4-40ac-80e6-38eb769abcc9	\N	\N	confirmed	Active	2026-04-11 08:55:32.503141	2026-04-11 08:55:32.503141	\N	\N	Kyungmi	SON	손경미	\N	\N	\N	Package Group: 2026 Jul-Melbourne_Oakleigh Schooling\nPackage: 2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child\nInstitute: Oakleigh Grammar\nAccommodation: Punthill Oakleigh	2567, Dalgubeol-Daero, Suseong-Gu, Daegu, Republic Of Korea	\N	Suseong	Daegu	42062	South Korea	Melbourne	f	\N	\N	\N
59e46538-3b62-4850-93c4-4e94273d4e7d	2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child-Won Kyeong KIM	3eda0426-7947-4640-a1fb-7f380179433d	2f1f35b2-ab89-4052-ac66-63d1e8661c5d	Won Kyeong KIM	haneulsom@naver.com	1086282512	\N	\N	1	1	\N	\N	\N	\N	\N	\N	\N	a93da133-21f8-4958-8cd5-9993048fb1b8	\N	\N	confirmed	Active	2026-04-11 08:55:08.822955	2026-04-11 08:55:08.822955	\N	\N	Won Kyeong	KIM	김원경	\N	\N	\N	Package Group: 2026 Jul-Melbourne_Oakleigh Schooling\nPackage: 2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child\nInstitute: Oakleigh Grammar\nAccommodation: Punthill Oakleigh	109-1402, 270, Sinbanpo-ro, Seocho-gu	\N	Seoul	\N	6544	South Korea	Melbourne	f	\N	\N	\N
64280bf3-118e-49d8-a3f1-2f22a1149374	2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child-Ahyoung YOON	3eda0426-7947-4640-a1fb-7f380179433d	c8093fc3-9ffe-4238-a112-e86c7300f358	Ahyoung YOON	yoonahyoung@gmail.com	010-5395-3437	\N	\N	1	2	\N	\N	\N	\N	\N	\N	\N	c1ed920a-cf61-4015-a0ba-bfc7fd25d2cd	\N	\N	confirmed	Active	2026-04-11 08:55:52.218332	2026-04-11 08:55:52.218332	\N	\N	Ahyoung	YOON	윤아영	\N	\N	\N	오클리로 지원하셨으나, 콜링우드로 최종 희망.\n향후 1년 살기도 고려중\n첫재는 6학년 가능하나, 둘째는 현재 3학년에서 자리가 없으므로, 3, 4, 2학년 순으로 대기.\n계약금 200만원 입금 3/8 확인.\n4월 말 프로그램 최종 결정.(둘째 자리 없을 경우, 200만원 전액 환불)\nPackage Group: 2026 Jul-Melbourne_Oakleigh Schooling\nPackage: 2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child\nInstitute: Oakleigh Grammar\nAccommodation: Punthill Oakleigh	312-102, 126, Seongbok 2-ro, Suji-gu	\N	Yongin-si	Gyeonggi-do	16851	South Korea	Melbourne	f	\N	\N	\N
2fc14f4d-0925-4833-a445-1c46e105d942	2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child-Seulgi LEE	3eda0426-7947-4640-a1fb-7f380179433d	c8093fc3-9ffe-4238-a112-e86c7300f358	Seulgi LEE	dewgy@naver.com	1048561765	\N	\N	1	2	\N	\N	\N	\N	\N	\N	\N	6d77ec2e-2080-422e-a36f-3235fc1b20db	\N	\N	confirmed	Active	2026-04-11 08:55:40.324627	2026-04-11 08:55:40.324627	\N	\N	Seulgi	LEE	이슬기	\N	\N	\N	2026년 6월 12일부터 8월 7일까지 오클리 단기 스쿨링 수속을 이슬지 메니져가 도움 드릴게요. \n시현 2013.02.16 - 2026년 7학년 지원\n문건 2015.04.25 - 2026년 5학년 지원\n\n6월 12일 - 25일; 2주(9일)\n7월 14일 - 8월 7일; 4주(19일)\n총 6주(28일)\nPackage Group: 2026 Jul-Melbourne_Oakleigh Schooling\nPackage: 2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child\nInstitute: Oakleigh Grammar\nAccommodation: Punthill Oakleigh	120, Beomeo-Ro 20-Gil,	\N	Suseong-Gu	Daegu	42089	South Korea	Melbourne	f	\N	\N	\N
e4a7c62d-06b6-4b9f-aa44-28c45ff4bea0	2026 Jul-Townsville_The Cathedral School -C Package 2 Adult / 1 Child-Youngmi Kim	f3da2590-9971-4c62-aa79-5906024e16d2	568a699f-33b1-407c-9e61-ba9ababd4209	Youngmi Kim	ym3jm@hanmail.net	010-4181-8797	\N	\N	2	1	\N	\N	\N	\N	\N	\N	\N	a80eef58-2a15-4a7d-8566-69fd824d2313	\N	\N	confirmed	Active	2026-04-11 08:55:59.916929	2026-04-11 08:55:59.916929	\N	\N	Youngmi	Kim	김영미	\N	\N	\N	Package Group: 2026 Jul-Townsville_The Cathedral School\nPackage: 2026 Jul-Townsville_The Cathedral School -C Package 2 Adult / 1 Child\nInstitute: The Cathedral School\nAccommodation: Jacana Apartments	미사강변중앙로 120  2501-1505호	\N	하남시	경기도	12920	대한민국	Townsville	f	\N	\N	\N
\.


ALTER TABLE myagency.camp_applications ENABLE TRIGGER ALL;

--
-- Data for Name: camp_tour_mgt; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.camp_tour_mgt DISABLE TRIGGER ALL;

COPY myagency.camp_tour_mgt (id, contract_id, camp_application_id, tour_provider_account_id, tour_name, tour_type, tour_date, tour_duration_hours, pickup_location, booking_reference, partner_cost, retail_price, status, notes, created_at, updated_at, ar_status, ap_status, coa_ar_code, coa_ap_code, is_active) FROM stdin;
\.


ALTER TABLE myagency.camp_tour_mgt ENABLE TRIGGER ALL;

--
-- Data for Name: chart_of_accounts; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.chart_of_accounts DISABLE TRIGGER ALL;

COPY myagency.chart_of_accounts (id, code, name, account_type, description, parent_code, is_active, created_on, modified_on) FROM stdin;
30a2ba10-f9ed-44a7-afa9-e732365f22a1	21320	ATO Paid	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
506dd1fe-05f9-45c5-af8f-2c6ee13d645a	21501	Tuition Fee Paid	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
10050079-aed2-409a-8341-ae8a74027f59	21520	Medical Check Fee Paid	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
bb27e2bb-e1ed-42bf-8635-9142a8e30d2a	21530	OSHC/OVHC Paid	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
b0c7adcb-44f5-4458-93a1-90cd8a536601	21510	Airport Pickup Service Fee Received	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
b6494a45-6a3b-4ac5-9e1f-d5249d4b0771	21511	Airport Pickup Service Fee-Paid	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
02abbfcb-e951-4cfd-b91b-72dea13f59e9	21512	Settlement Service Fee Received	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
9c4ffee9-69ac-479e-8776-0b966b9ce71d	21513	Referral Fee Paid	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
60302f13-e0eb-47a9-b13a-692e3aa5c9f2	21514	Accounts Payable - Student Deposit	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
970207f6-3146-4efd-9280-afeafe366f56	21515	OSHC/OVHC Fee	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
da15e939-7d17-4ccc-965e-a8893c5ca2ad	63401	Translation Fee Received	revenue	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
5ee3e9be-3627-4df7-af97-3051d0aae70c	44080	Rent Income	revenue	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
a708a047-50f3-4d19-afff-c0d2a97b8df8	11114	Card Surcharge	asset	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
22b7b56d-868b-47ed-bdc2-f359da41e586	11130	Petty Cash Account	asset	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
609e4c26-b055-42d8-af1d-fa1ca7265da1	12300	Motor Vehicle	asset	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
d5438636-0261-41a3-8126-dedd9e4b0c3d	12345	Internal Transfer	asset	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
a4103a8d-e996-4624-9a6a-b53e4d667b96	22000	Current Liabilities: Refund from Supplier	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
932c358b-70df-4311-9fb1-7342f6eddf45	29020	Loan from Others	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
080622c2-8a87-4143-b350-19912a786b30	38000	Retained Earnings	equity	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
4ab45391-246a-42aa-b9e6-c5cdcc887b03	61100	Advertising	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
3fe293fa-25bb-430c-9ca0-aa2aa05ddc1e	61200	Bank Charges	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
0f6e2ac0-7479-423c-95e6-889f62a27521	61300	Business Promotions	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
179b8d0a-1bab-41a8-8241-d62308cbdb6c	61320	Marketing Expenses	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
e28fa5c5-5e1e-4258-9ce4-4555f69a6f7a	61400	Business Travel	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
4735ae9c-a2cc-4200-9fed-7a7c876d2807	61700	BAS Expense	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
99f1f886-2ed6-4662-a4ed-bafd14ec9c2f	61900	Accommodation Expense	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
861e196e-2e37-478b-ba17-d6149f196c42	62200	Educational/Study Tours	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
ea782505-7641-4d57-b0dc-184d345d6cd2	62400	Gifts & Samples	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
e76a1d23-8df3-4780-98a9-372a425aee2d	62450	Web Development	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
0fd725c1-ac5e-48a1-ba2c-9742db0b4965	62500	Internet/Software	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
e2a01d3d-57d7-420c-a667-d03f87043951	62600	Web Hosting	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
1270445b-0cd5-43c2-bc41-80f92567705b	63000	Legal Fees	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
cd4c810f-21a6-4afd-bfd3-13ed3635d6e4	63300	Mobile Phone	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
1777023d-e9fd-4a94-8bb4-1e76a60c5751	64100	Professional Service Fees	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
891d70f5-c94b-4a13-855e-1b83ba23782f	65000	Office Supplies	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
7d1858ec-52d1-4643-a952-7a67df5d75a0	65100	Research and Professional Development	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
24418e55-bd4f-4296-b338-84112d59eda5	65250	Petrol Expense	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
45769ffd-aa57-4749-9244-aaa2b762dbed	65600	Transport Fee	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
bbd5c5e1-632d-4721-9749-7ecf61dfb526	66200	Permits and Licences	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
141ea102-ae36-4448-b82d-d69550662a17	66300	Postage	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
b57e277c-5e68-4bc8-a938-dd29c0827e4c	66400	Insurance	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
99f6e800-e0a1-42d6-ad63-e2155c0b0cd1	66700	Registration Fees	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
9d53d800-5a24-4efc-b1bd-22ae9d70b3f8	67000	Office Rent	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
c779c1e9-5474-4cb2-8bca-8509ef1fb999	67100	Repairs & Maintenance	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
6d2e4f58-44d1-4881-9a80-b64bbce1ce13	67500	Superannuation	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
dc042db7-fd1f-4d46-9408-092a0455a92f	68000	Staff Amenity	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
0fcd1c32-cf97-472e-8815-ac8da8d32f37	68200	Training and Seminars	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
a1d775dc-a1df-498a-a42a-9b64a12833e6	69000	Wages & Salaries	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
107b4b4f-461f-446b-8744-a53792dad96f	91000	Interest Expense	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
df8d181a-6b50-4566-a357-29b9739f17ee	21551	Visa App Fee Paid	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
7e9cad88-8335-4b09-ad8e-2d90f7577b74	21550	Accounts Payable - Student Deposit: Visa App Fee Paid	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
91c7d10f-111c-4e05-8bda-6c126ea714c7	22021	Current Liabilities: Refund to Client	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
dab5a444-fa39-4cc6-b729-c338859628ab	22020	Refund Payout for Deducted Commission	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
d00c0397-a1a5-4749-ad43-8e459487b7ed	21800	GST Liabilities Payable	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
5c2cc28b-e17e-4462-95b0-d6b08caf6287	21560	Application/Administration Fees	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
23d475db-7f42-45ff-aa0c-0ebf86ce9de3	29011	Loan from Director (S J Kim)	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
4cf09469-8387-4d09-a8b8-394ddec4858e	21570	Accommodation Fee Paid	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
6d8cac65-6c60-4eb6-86b8-9fc6aa798a30	29010	Loan from Directors	liability	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
c6949be3-9f1a-4569-ae7d-4f93785b3aad	61000	Accounting and Audit Fees	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
d4a026bb-cbce-4b06-87ba-4000cd909c3d	63400	Translation Fee Paid	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
f1ba452f-2ecc-4dac-9de1-5e226432480a	50000	Student Discounts	cogs	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
853cab36-b27f-421c-95eb-1c37d40b8b24	65400	Car Maintenance	expense	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
c72d7c9e-7bd8-4ca4-bb0f-c7e6be848547	40000	Commission Income	revenue	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
cb0c3a5d-9a15-4367-bd63-29856c1450ed	44010	Other Income: Visa Service Fee	revenue	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
96759d8e-54f6-4939-acc8-2777a0861e81	44020	Other Income: Agent Bonus	revenue	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
ed4c130b-cb3b-4f6b-a0d8-24f3d22423bd	44040	Other Income: OSHC/OVHC Commission	revenue	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
106eef7d-ec1a-4c47-98a2-788a4aaa0e2c	44050	Other Income: Schooling	revenue	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
4f76c395-8202-4df7-a59f-6d08a638331b	44071	Other Income: Settlement Service	revenue	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
72b35533-ac15-4ecc-8b7e-ba5b2812035f	45000	Other Income: Credit Interest	revenue	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
7b319489-69cd-44a9-b234-75456c32e772	44072	Other Income: Referral Fee Received	revenue	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
f33719cd-b95d-42ce-9736-21b3299f5dde	44070	Other Income: Other Service Fee	revenue	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
ef68838c-26b3-4251-9618-a001b6012468	53001	Job/Internship Placement Fee Received	revenue	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
f0b016e8-d96e-497d-93e5-8ccbb63589f5	51000	Sub Commission Paid	cogs	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
b0ea4cfe-8797-4546-b52e-2ee978494582	52000	Discount Allowance	cogs	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
b753b26e-8025-4101-b550-51e259dc875e	54000	Homestay Fee	cogs	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
de943965-59a1-4677-be56-4b846db54f1e	53000	Job/Internship Placement Fee Paid	cogs	\N	\N	t	2026-04-12 08:07:41.729094	2026-04-12 08:07:41.729094
\.


ALTER TABLE myagency.chart_of_accounts ENABLE TRIGGER ALL;

--
-- Data for Name: chat_chunks; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.chat_chunks DISABLE TRIGGER ALL;

COPY myagency.chat_chunks (id, doc_id, chunk_index, text, embedding, created_at) FROM stdin;
\.


ALTER TABLE myagency.chat_chunks ENABLE TRIGGER ALL;

--
-- Data for Name: chat_documents; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.chat_documents DISABLE TRIGGER ALL;

COPY myagency.chat_documents (id, title, source, source_type, content, created_at, updated_at, scope) FROM stdin;
\.


ALTER TABLE myagency.chat_documents ENABLE TRIGGER ALL;

--
-- Data for Name: commissions; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.commissions DISABLE TRIGGER ALL;

COPY myagency.commissions (id, name, commission_type, rate_value, description, status, created_on, modified_on) FROM stdin;
b412cc05-923f-40ed-b418-82d6674979bb	Nil	nil	0.00	No commission applies to this product.	Active	2026-04-12 07:53:47.578287	2026-04-12 07:53:47.578287
cf69a2ff-af37-4a1f-a22e-0f1a9d78325a	Fixed	fixed	\N	Fixed commission amount as individually agreed per product or provider contract.	Active	2026-04-12 07:53:47.578287	2026-04-12 07:53:47.578287
cbdbdafd-1cf3-4313-890a-b38e6e4f9bdd	Rate10	rate	10.00	10% commission rate applied on the product price.	Active	2026-04-12 07:53:47.578287	2026-04-12 07:53:47.578287
4a11e8a8-d2ff-4db8-9461-9af2de89025f	Rate15	rate	15.00	15% commission rate applied on the product price.	Active	2026-04-12 07:53:47.578287	2026-04-12 07:53:47.578287
c8afa668-fa1d-4f36-be2a-a2f8d64bf231	Rate20	rate	20.00	20% commission rate applied on the product price.	Active	2026-04-12 07:53:47.578287	2026-04-12 07:53:47.578287
97064699-e2e7-4d35-94db-9fe316be25a6	Rate25	rate	25.00	25% commission rate applied on the product price.	Active	2026-04-12 07:53:47.578287	2026-04-12 07:53:47.578287
7ca023c6-4199-41d7-aafe-a6a0956b346e	Rate30	rate	30.00	30% commission rate applied on the product price.	Active	2026-04-12 07:53:47.578287	2026-04-12 07:53:47.578287
ade82ab8-a321-476f-ba02-d40850c0983d	Rate35	rate	35.00	35% commission rate applied on the product price.	Active	2026-04-12 07:53:47.578287	2026-04-12 07:53:47.578287
dd8939ba-0a46-4b38-9292-ad01a3f681e6	Rate45	rate	45.00	45% commission rate applied on the product price.	Active	2026-04-12 07:53:47.578287	2026-04-12 07:53:47.578287
957e1ca4-9f46-427c-8069-ca0c8a859d67	Rate50	rate	50.00	50% commission rate applied on the product price.	Active	2026-04-12 07:53:47.578287	2026-04-12 07:53:47.578287
\.


ALTER TABLE myagency.commissions ENABLE TRIGGER ALL;

--
-- Data for Name: contacts; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.contacts DISABLE TRIGGER ALL;

COPY myagency.contacts (id, first_name, last_name, title, dob, gender, nationality, email, mobile, office_number, sns_type, sns_id, influx_channel, important_date_1, important_date_2, description, status, account_type, created_on, modified_on, original_name, full_name, english_name, profile_image_url, organisation_id, preferred_name, current_year, passport_no, privacy_consent, marketing_consent) FROM stdin;
f2e92036-c636-4339-a9d5-996f9e641fc9	Sung Hark	HONH	\N	\N	\N	\N	harky00@naver.com	+821088647297	\N	\N	\N	\N	\N	\N	\N	Active	Parent	2026-04-11 08:56:42.634263	2026-04-11 08:56:42.634263	홍성학	Sung Hark HONH	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	\N	\N	f	f
c5b1d3b1-a2c8-4399-80fb-ed3eaa4b5e32	Myungjun	Jung	\N	\N	\N	\N	\N	+821050488755	\N	\N	\N	\N	\N	\N	\N	Active	Parent	2026-04-11 08:56:50.543354	2026-04-11 08:56:50.543354	정명준	Myungjun Jung	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	\N	\N	f	f
57814348-a665-4cfb-bfd5-e36f9684049a	Wing Tung	PANG	\N	\N	\N	\N	joseph.wt.pang@gmail.com	+85291000969	\N	\N	\N	\N	\N	\N	\N	Active	Parent	2026-04-11 08:56:58.079038	2026-04-11 08:56:58.079038	\N	Wing Tung PANG	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	\N	\N	f	f
8fd53a1a-6136-420c-bf40-e3fb0a63e13e	Jungjae	LEE	\N	\N	\N	\N	peter7770@maver.com	+821029377779	\N	\N	\N	\N	\N	\N	\N	Active	Parent	2026-04-11 08:57:05.817232	2026-04-11 08:57:05.817232	이정재	Jungjae LEE	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	\N	\N	f	f
49babc36-f265-4612-8822-b94385e0d62d	Aejin	CHOI	\N	\N	\N	\N	choiaejin@hotmail.com	+821089743601	\N	\N	\N	\N	\N	\N	\N	Active	Parent	2026-04-11 08:57:13.753366	2026-04-11 08:57:13.753366	최애진	Aejin CHOI	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	\N	\N	f	f
680d2388-fb91-490e-8533-4ae94008a832	Yul	LEE	\N	2018-07-04	Male	South Korea	gtw0107@naver.com	+82 10 2209 0050	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:57:40.416123	2026-04-11 08:57:40.416123	\N	Yul LEE	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Leo	Grade 2	\N	f	f
fe9fc2c7-60a1-4414-95c4-6eeb76408d7a	Sihun	LEE	\N	2016-03-04	Male	South Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:57:48.362771	2026-04-11 08:57:48.362771	\N	Sihun LEE	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Sean	Grade 4	\N	f	f
c6b2d0ab-b0ce-42ff-940a-2facf372546c	Younchan	LEE	\N	2018-12-14	Male	South Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:57:56.386709	2026-04-11 08:57:56.386709	\N	Younchan LEE	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Chan	Grade 2	\N	f	f
d1def206-790f-48dd-bfee-a5ebadb8490a	Yubin	KIM	\N	2015-07-12	Male	South Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:58:04.179404	2026-04-11 08:58:04.179404	\N	Yubin KIM	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Yubin	Grade 5	\N	f	f
be1c016d-0db9-4ec5-948c-06c57ea54c38	Ain	SONG	\N	2017-07-24	Female	South Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:58:12.003175	2026-04-11 08:58:12.003175	\N	Ain SONG	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Ain	Grade 3	\N	f	f
1c3711d2-9f6f-41b7-8f15-ce0638927e60	Sehyun	PARK	\N	2018-01-10	Male	South Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:58:19.71289	2026-04-11 08:58:19.71289	\N	Sehyun PARK	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Samuel	Grade 2	\N	f	f
7fef9652-889b-490d-85a6-88b11d2319db	Suho	YOO	\N	2018-03-03	Male	South Korea	\N	1026651504	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:58:35.416427	2026-04-11 08:58:35.416427	\N	Suho YOO	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Kai	Grade 2	\N	f	f
7d0e21bc-d259-43a7-ba7c-0b21ab566f0e	Soyul	KANG	\N	2015-02-10	Female	South Korea	sk2cha@naver.com	1086046305	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:58:27.751892	2026-04-11 08:58:27.751892	\N	Soyul KANG	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Estella	Grade 5	\N	f	f
c337984a-b91a-4773-8ca5-958151cd3699	Seoyoon	CHUNG	\N	2014-10-29	Female	South Korea	izzyggu0984@gmail.com	1068789025	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:58:43.161744	2026-04-11 08:58:43.161744	\N	Seoyoon CHUNG	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Seoyoon	Grade 6	\N	f	f
d4e17d07-f429-45f3-be48-31a3f09ef3d1	Jeongyeon	KIM	\N	2018-02-03	Female	South Korea	twinkle0826@naver.com	1084843467	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:58:50.968259	2026-04-11 08:58:50.968259	\N	Jeongyeon KIM	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Jenny	Grade 1	\N	f	f
09b3bef0-936c-440e-b05c-5d9479c09c06	Youngho	LIU	\N	2016-01-27	Male	South Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:58:58.876911	2026-04-11 08:58:58.876911	\N	Youngho LIU	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Leo	Grade 3	\N	f	f
0e124f0e-4b6d-445e-931c-fd44a029681a	Eunho	LIU	\N	2018-11-16	Female	South Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:59:06.496948	2026-04-11 08:59:06.496948	\N	Eunho LIU	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Lucy	Grade 1	\N	f	f
17c7f392-a05e-4ed8-896d-0d19f0b6aadd	Layoon	JEONG	\N	2018-01-21	Female	South Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:59:14.357249	2026-04-11 08:59:14.357249	\N	Layoon JEONG	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Yunee	Grade 1	\N	f	f
25e56e64-c532-49b7-b98c-d2352b1b6b60	Jihwan	LEE	\N	2016-05-28	Male	South Korea	erinheo@gmail.com	1088284797	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:59:21.98871	2026-04-11 08:59:21.98871	\N	Jihwan LEE	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Leo	Grade 3	\N	f	f
ddc2853e-0286-46d7-a57a-d6ffdd88294b	Ajeong	LIM	\N	2013-08-15	Female	South Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:59:29.792733	2026-04-11 08:59:29.792733	\N	Ajeong LIM	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Ajeong	Grade 6	\N	f	f
ce5df9e7-8569-4415-95c6-966b82f7f834	Woojoo	LIM	\N	2016-02-04	Male	South Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:59:37.613034	2026-04-11 08:59:37.613034	\N	Woojoo LIM	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Woojoo	Grade 3	\N	f	f
9670188b-fa48-424f-81ae-666411e7f4bd	Sihyun	LEE	\N	2013-02-16	Female	South Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:59:45.215332	2026-04-11 08:59:45.215332	\N	Sihyun LEE	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Sihyun	Grade 6	\N	f	f
e8766d95-5ea1-47ef-8d11-2256cff402da	Moongun	LEE	\N	2015-04-25	Male	South Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 08:59:53.209582	2026-04-11 08:59:53.209582	\N	Moongun LEE	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Moongun	Grade 4	\N	f	f
2aa8ca94-bbf9-403a-af42-a7bf92541a48	Soyul	KANG	\N	2015-02-10	Female	Republic of Korea	sy2kang15@naver.com	+821086046305	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:00:01.159784	2026-04-11 09:00:01.159784	\N	Soyul KANG	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Estella	Grade 5	M927Y1868	f	f
dd2c669f-619a-448d-b0ab-47ac4e225bfc	Leah	LIM	\N	2014-03-21	Female	Korean	\N	+821053803437	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:00:08.942926	2026-04-11 09:00:08.942926	\N	Leah LIM	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Leah	Grade 6	M04989713	f	f
0ef9dc34-6692-4170-aec3-bcc0701d8d4c	Noah	LIM	\N	2017-02-01	Male	Korean	\N	+821053953497	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:00:16.910201	2026-04-11 09:00:16.910201	\N	Noah LIM	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Noah	Grade 3	M11805707	f	f
4129eb7d-4231-4873-9b45-a75476849057	Min Jeong	SA	\N	2016-06-24	Female	KOREA	harky00@naver.com	+821088647297	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:00:24.672443	2026-04-11 09:00:24.672443	\N	Min Jeong SA	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	사민정	Grade 4	M081B3912	f	f
b3adf56c-abf6-4a1b-846e-c992579a257c	Hayul	Jung	\N	2014-09-12	Male	South Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:00:32.441852	2026-04-11 09:00:32.441852	\N	Hayul Jung	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	Grade 6	\N	f	f
9918f45a-5b60-4e8b-bced-df9b7f13c7ce	test	etse	\N	2026-03-03	Male	test	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:00:36.475534	2026-04-11 09:00:36.475534	\N	test etse	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	Grade 2	\N	f	f
b8191cf6-fda6-469e-abc0-d87f706b07a7	Hayul	Jung	\N	2014-09-12	Male	대한민국	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:00:40.510564	2026-04-11 09:00:40.510564	\N	Hayul Jung	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	Grade 6	\N	f	f
ffae08ea-aec9-4304-8187-c506211911c6	zxvzvx	zvzv	\N	2026-03-01	Female	korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:00:48.342298	2026-04-11 09:00:48.342298	\N	zxvzvx zvzv	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	Grade 1	\N	f	f
f3aedd86-1be0-46a6-87f0-ef3e1c3eb4ab	Sungjun	Yoon	\N	2017-10-23	Male	Korea	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:00:52.388373	2026-04-11 09:00:52.388373	\N	Sungjun Yoon	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Jun	Grade 3	\N	f	f
e6f12150-2712-4a49-a9dc-2b9cf0f3f5b5	DAMYUN	PARK	\N	2017-08-06	Female	Korean	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:01:00.043561	2026-04-11 09:01:00.043561	\N	DAMYUN PARK	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	Grade 3	M653G5689	f	f
a6b0e8d5-059c-4594-974e-d154f4fa8316	SIYUN	PARK	\N	2019-05-27	Male	Korean	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:01:07.924238	2026-04-11 09:01:07.924238	\N	SIYUN PARK	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	Grade 1	M286A9309	f	f
fea18c58-9e29-47a4-92b9-3b621a771358	Lok Yung Valerie	PANG	\N	2014-04-04	Female	Chinese	doris.fang@gmail.com	+85291000969	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:01:15.733675	2026-04-11 09:01:15.733675	\N	Lok Yung Valerie PANG	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Valerie	Grade 6	\N	f	f
a56ecf30-d1f7-4d0d-a9cd-630e407f5c01	Lok Yee Rachel	PANG	\N	2015-07-28	Female	Chinese	doris.fang@gmail.com	+85291000969	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:01:23.607689	2026-04-11 09:01:23.607689	\N	Lok Yee Rachel PANG	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Rachel	Grade 5	\N	f	f
62762865-d527-473e-bfed-f6eaf77205a0	Yoonho	JUN	\N	2019-11-28	Male	South Korea	sonahhyun@naver.com	+821020287558	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:01:31.69378	2026-04-11 09:01:31.69378	\N	Yoonho JUN	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Anthony Jun	Grade 1	M537R4998	f	f
7ec82176-6877-4a1f-923f-a2052c552889	Jimin	LEE	\N	2015-12-05	Female	Korea	\N	+821057857779	\N	\N	\N	\N	\N	\N	\N	Active	Student	2026-04-11 09:01:39.495897	2026-04-11 09:01:39.495897	\N	Jimin LEE	\N	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	Grace	Grade 5	M94787881	f	f
\.


ALTER TABLE myagency.contacts ENABLE TRIGGER ALL;

--
-- Data for Name: contract_finance_items; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.contract_finance_items DISABLE TRIGGER ALL;

COPY myagency.contract_finance_items (id, contract_id, item_type, item_category, cost_center, label, linked_product_id, linked_partner_id, linked_agent_id, estimated_amount, actual_amount, currency, commission_type, commission_rate, commission_fixed, due_date, paid_date, status, is_auto_generated, is_deleted, notes, created_at, updated_at, organisation_id) FROM stdin;
\.


ALTER TABLE myagency.contract_finance_items ENABLE TRIGGER ALL;

--
-- Data for Name: contract_products; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.contract_products DISABLE TRIGGER ALL;

COPY myagency.contract_products (id, contract_id, product_id, quantity, unit_price, total_price, status, created_at, ar_due_date, ap_due_date, ar_amount, ap_amount, ar_status, ap_status, coa_ar_code, coa_ap_code, service_module_type, name, sort_index, is_initial_payment, gross_amount, school_amount, commission_amount, net_revenue, remittance_method, commission_ar_status, gst_amount, is_gst_free, provider_account_id, organisation_id) FROM stdin;
139419fa-a775-497b-b9d6-527b4e34170f	d440f5c0-aa75-4c7b-afab-673a3168f07e	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-08-01	2026-08-01	7300.00	1200.00	scheduled	pending	\N	\N	school_camp	Oakleigh Schooling - Package C (2 Adult / 1 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
98d3218d-03be-43f4-ad80-ea93d15fb362	a3e30696-0225-483e-a287-752aeeb9a200	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	9800.00	1400.00	scheduled	pending	\N	\N	school_camp	Collingwood Schooling - Package A (1 Adult / 1 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
f91f9003-7b6d-42e0-b3f6-2ee84153fb50	a93da133-21f8-4958-8cd5-9993048fb1b8	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	9900.00	1400.00	scheduled	pending	\N	\N	school_camp	Oakleigh Schooling - Package A (1 Adult / 1 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
fdf33b15-f771-4304-b147-1e910f0fbbe2	20b6c86c-3c39-48be-a9ed-fcce5ab702c6	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	9900.00	1400.00	scheduled	pending	\N	\N	school_camp	Oakleigh Schooling - Package A (1 Adult / 1 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
c79a70a3-4f5d-44d0-a988-7ea8aec46c37	27a7de5a-55cc-420f-bbb3-d39a985828a9	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-08-01	2026-08-01	6600.00	1000.00	scheduled	pending	\N	\N	school_camp	Oakleigh Schooling - Package A (1 Adult / 1 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
abb9c378-0efb-45c9-b2cb-b2fe94793041	e5cf9530-24d2-435d-8b2b-9f70bf75d7ab	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-08-01	2026-08-01	10800.00	1200.00	scheduled	pending	\N	\N	school_camp	Oakleigh Schooling - Package D (2 Adult / 2 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
b3c0fb16-23bc-45fb-9f3d-52c7fd2a09dd	bfc32694-5d78-4a94-aebb-87902d57154d	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	14200.00	1600.00	scheduled	pending	\N	\N	school_camp	Oakleigh Schooling - Package B (1 Adult / 2 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
aaff8403-17ae-429b-8c64-d99bbbf31d2a	a80eef58-2a15-4a7d-8566-69fd824d2313	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	11100.00	1300.00	scheduled	pending	\N	\N	school_camp	The Cathedral School Townsville - Package C (2 Adult / 1 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
3235b48b-ec60-42f2-82da-68e796fb3ad9	c1ed920a-cf61-4015-a0ba-bfc7fd25d2cd	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	14200.00	1500.00	scheduled	pending	\N	\N	school_camp	Collingwood Schooling - Package B (1 Adult / 2 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
e77e8fc9-97b7-4fcb-b5e8-181cd2c35b47	461c6292-fb62-41f1-840a-d8dcb94a2a89	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	1120.00	1500.00	scheduled	pending	\N	\N	school_camp	Collingwood Schooling - Package C (2 Adult / 1 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
02ff8940-4910-4ec2-8184-f49eb0d66826	3cda3dcc-2c4b-46fb-90b4-4836227db98c	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	9700.00	1200.00	scheduled	pending	\N	\N	school_camp	Browns English Camp Melbourne - Package A (1 Adult / 1 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
f106c2f8-16ab-44d2-8379-e582e5123d7a	3c7871d3-6722-446b-bcc6-39722b7e443d	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	14200.00	1600.00	scheduled	pending	\N	\N	school_camp	Oakleigh Schooling - Package B (1 Adult / 2 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
a51219c0-7f95-4af1-8fa8-609d250f42f5	a82d9619-f105-405d-a1c7-5d51c4b1dcfc	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	9800.00	1400.00	scheduled	pending	\N	\N	school_camp	Collingwood Schooling - Package A (1 Adult / 1 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
3d4f3856-ebbf-4765-ba8d-e14e8e8a7415	6d77ec2e-2080-422e-a36f-3235fc1b20db	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	14200.00	1600.00	scheduled	pending	\N	\N	school_camp	Oakleigh Schooling - Package B (1 Adult / 2 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
1a964bc1-8e39-4193-891b-c71181a9d5bb	af574d96-22a4-40ac-80e6-38eb769abcc9	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	9900.00	1400.00	scheduled	pending	\N	\N	school_camp	Oakleigh Schooling - Package A (1 Adult / 1 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
823f0ab7-a64e-4dd1-b3be-436ee518db11	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	15000.00	1500.00	scheduled	pending	\N	\N	school_camp	Collingwood Schooling - Package B (1 Adult / 2 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
dd62574f-4f20-47b6-820e-655456d94082	c2cf71a6-8877-40f1-8685-16c7fd32e805	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	9800.00	1400.00	scheduled	pending	\N	\N	school_camp	Collingwood Schooling - Package A (1 Adult / 1 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
ea531119-6165-45dc-94bc-5df2362be075	ee54ee4c-5adf-4a40-acda-403c1bfced50	\N	1	\N	\N	pending	2026-04-14 00:18:36.734048	2026-07-01	2026-07-01	9900.00	1400.00	scheduled	pending	\N	\N	school_camp	Oakleigh Schooling - Package A (1 Adult / 1 Child)	1	f	\N	\N	\N	\N	\N	\N	\N	f	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
8f4af101-493d-488d-b465-a3131e44cd83	d76bea55-68fa-4a62-a537-a94a16902391	\N	1	\N	\N	pending	2026-04-14 13:39:38.792492	\N	\N	500.00	\N	scheduled	pending	\N	\N	\N	Deposit	0	t	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
6c4e1e27-b9c5-4117-9f19-a342e0469b08	d440f5c0-aa75-4c7b-afab-673a3168f07e	\N	1	\N	\N	pending	2026-04-14 13:44:29.0757	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
5101d8d1-6f46-4141-8a80-358e97abae93	eed783de-f7e2-4c03-8329-4499ccc5d534	\N	1	\N	\N	pending	2026-04-14 13:44:29.161586	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
0d8bd45c-4ece-481e-884f-c611d7203849	a3e30696-0225-483e-a287-752aeeb9a200	\N	1	\N	\N	pending	2026-04-14 13:44:29.226483	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
a5e75524-dff9-41b5-bf4d-6c49605879c1	a93da133-21f8-4958-8cd5-9993048fb1b8	\N	1	\N	\N	pending	2026-04-14 13:44:29.285236	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
a7582d27-a068-40d5-8269-1b5658a84012	20b6c86c-3c39-48be-a9ed-fcce5ab702c6	\N	1	\N	\N	pending	2026-04-14 13:44:29.344064	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
65e63b22-a608-4904-b5cb-859515d16711	d76bea55-68fa-4a62-a537-a94a16902391	\N	1	\N	\N	pending	2026-04-14 13:44:29.465654	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
adf706bf-aca0-4b63-9c0b-05bd289a5ca7	27a7de5a-55cc-420f-bbb3-d39a985828a9	\N	1	\N	\N	pending	2026-04-14 13:44:29.56627	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
07f50bb4-2576-416e-bd1f-a8afeb23c183	e5cf9530-24d2-435d-8b2b-9f70bf75d7ab	\N	1	\N	\N	pending	2026-04-14 13:44:29.645334	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
76e320ff-2243-48a1-9d48-1b232cb7aebc	bfc32694-5d78-4a94-aebb-87902d57154d	\N	1	\N	\N	pending	2026-04-14 13:44:29.725888	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
f7652c23-0770-4535-b3ca-523f44726601	a80eef58-2a15-4a7d-8566-69fd824d2313	\N	1	\N	\N	pending	2026-04-14 13:44:29.828815	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
e344d6d7-f2a6-4f19-b648-828e58a34ccc	c1ed920a-cf61-4015-a0ba-bfc7fd25d2cd	\N	1	\N	\N	pending	2026-04-14 13:44:29.920641	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
f5b8a325-99ee-40d5-addb-97cc891a6f75	461c6292-fb62-41f1-840a-d8dcb94a2a89	\N	1	\N	\N	pending	2026-04-14 13:44:29.98368	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
0d350ebd-4e63-4ab8-8743-ffd6936f43f6	3cda3dcc-2c4b-46fb-90b4-4836227db98c	\N	1	\N	\N	pending	2026-04-14 13:44:30.048367	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
24c27725-395b-4f40-9fbb-da8fe0979a17	3c7871d3-6722-446b-bcc6-39722b7e443d	\N	1	\N	\N	pending	2026-04-14 13:44:30.127965	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
bc967db9-204c-4dc8-9d40-8a182194f03c	a82d9619-f105-405d-a1c7-5d51c4b1dcfc	\N	1	\N	\N	pending	2026-04-14 13:44:30.199131	\N	\N	100.00	\N	scheduled	pending	\N	\N	\N	Test	0	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
86fbd2dd-995c-4d3f-87ff-efb2b9c42692	cccc0001-0000-0000-0000-000000000001	\N	1	9600.00	9600.00	active	2026-04-15 10:52:31.804837	\N	\N	9600.00	8640.00	scheduled	pending	\N	\N	study_abroad	ELICOS 24 Weeks	1	f	\N	\N	\N	\N	\N	\N	\N	f	632d62d0-ec97-41f9-93b7-eb1e8df595e4	a1b2c3d4-e5f6-7890-abcd-ef1234567890
9d93e8d1-9f63-4e66-9abc-f3882fddef81	cccc0001-0000-0000-0000-000000000001	\N	1	7200.00	7200.00	active	2026-04-15 10:52:31.804837	\N	\N	7200.00	5760.00	scheduled	pending	\N	\N	accommodation	Homestay 24 Weeks	2	f	\N	\N	\N	\N	\N	\N	\N	f	632d62d0-ec97-41f9-93b7-eb1e8df595e4	a1b2c3d4-e5f6-7890-abcd-ef1234567890
05d8189a-d514-41ad-852f-116135177c20	cccc0002-0000-0000-0000-000000000002	\N	1	14400.00	14400.00	pending	2026-04-15 10:52:31.804837	\N	\N	14400.00	12960.00	scheduled	pending	\N	\N	study_abroad	University Pathway 12 Months	1	f	\N	\N	\N	\N	\N	\N	\N	f	632d62d0-ec97-41f9-93b7-eb1e8df595e4	a1b2c3d4-e5f6-7890-abcd-ef1234567890
98b8443b-8f46-4e49-90ea-6931bd48095f	cccc0002-0000-0000-0000-000000000002	\N	1	12000.00	12000.00	pending	2026-04-15 10:52:31.804837	\N	\N	12000.00	9600.00	scheduled	pending	\N	\N	accommodation	Student Accommodation 12 Months	2	f	\N	\N	\N	\N	\N	\N	\N	f	632d62d0-ec97-41f9-93b7-eb1e8df595e4	a1b2c3d4-e5f6-7890-abcd-ef1234567890
07c82e26-a446-4628-b440-309e9fd8dcd2	cccc0002-0000-0000-0000-000000000002	\N	1	120.00	120.00	pending	2026-04-15 10:52:31.804837	\N	\N	120.00	90.00	scheduled	pending	\N	\N	pickup	Airport Pickup	3	f	\N	\N	\N	\N	\N	\N	\N	f	632d62d0-ec97-41f9-93b7-eb1e8df595e4	a1b2c3d4-e5f6-7890-abcd-ef1234567890
d63e8a3b-36e1-4782-95e3-06ff61826268	cccc0003-0000-0000-0000-000000000003	\N	1	4800.00	4800.00	completed	2026-04-15 10:52:31.804837	\N	\N	4800.00	4320.00	paid	paid	\N	\N	study_abroad	ELICOS 12 Weeks	1	f	\N	\N	\N	\N	\N	\N	\N	f	632d62d0-ec97-41f9-93b7-eb1e8df595e4	a1b2c3d4-e5f6-7890-abcd-ef1234567890
397ca968-6d38-4ffe-bd87-57e01ed0d762	cccc0003-0000-0000-0000-000000000003	\N	1	3600.00	3600.00	completed	2026-04-15 10:52:31.804837	\N	\N	3600.00	2880.00	paid	paid	\N	\N	accommodation	Homestay 12 Weeks	2	f	\N	\N	\N	\N	\N	\N	\N	f	632d62d0-ec97-41f9-93b7-eb1e8df595e4	a1b2c3d4-e5f6-7890-abcd-ef1234567890
7679d6fa-4e74-4752-b002-3c4aeb1097f5	cccc0003-0000-0000-0000-000000000003	\N	1	220.00	220.00	completed	2026-04-15 10:52:31.804837	\N	\N	220.00	176.00	paid	paid	\N	\N	pickup	Airport Pickup	3	f	\N	\N	\N	\N	\N	\N	\N	f	632d62d0-ec97-41f9-93b7-eb1e8df595e4	a1b2c3d4-e5f6-7890-abcd-ef1234567890
08ce3f02-75d9-4f40-bac5-ef5c4d5bf3e0	cccc0004-0000-0000-0000-000000000004	\N	1	5500.00	5500.00	active	2026-04-15 10:52:31.804837	\N	\N	5500.00	4950.00	partial	pending	\N	\N	study_abroad	English Bridge Program	1	f	\N	\N	\N	\N	\N	\N	\N	f	632d62d0-ec97-41f9-93b7-eb1e8df595e4	a1b2c3d4-e5f6-7890-abcd-ef1234567890
731a5406-07d8-45de-b8e0-4ad2fa1d0642	cccc0005-0000-0000-0000-000000000005	\N	1	3200.00	3200.00	completed	2026-04-15 10:52:31.804837	\N	\N	3200.00	2880.00	paid	paid	\N	\N	study_abroad	General English 12 Weeks	1	f	\N	\N	\N	\N	\N	\N	\N	f	632d62d0-ec97-41f9-93b7-eb1e8df595e4	a1b2c3d4-e5f6-7890-abcd-ef1234567890
\.


ALTER TABLE myagency.contract_products ENABLE TRIGGER ALL;

--
-- Data for Name: contracts; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.contracts DISABLE TRIGGER ALL;

COPY myagency.contracts (id, contract_number, application_id, camp_provider_id, total_amount, currency, status, start_date, end_date, notes, created_at, updated_at, paid_amount, balance_amount, signed_at, student_name, client_email, client_country, package_group_name, package_name, agent_name, payment_frequency, course_start_date, course_end_date, total_ar_amount, total_ap_amount, service_modules_activated, quote_id, account_id, owner_id, customer_contact_id, commission_type, primary_service_module, is_active, agent_account_id, organisation_id, camp_application_id, agent_initial, admin_note, partner_note, kakao_name, google_folder_title) FROM stdin;
eed783de-f7e2-4c03-8329-4499ccc5d534	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child_Jia CHA	\N	\N	9800.00	AUD	cancelled	\N	\N	\N	2026-04-11 09:20:50.020353	2026-04-11 09:20:50.020353	\N	9800.00	\N	Soyul KANG	sk2cha@naver.com	South Korea	2026 Jul-Melbourne_Collingwood Schooling	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child	MomWith	\N	\N	\N	3439.00	1400.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	887aeb90-8f28-4908-98ad-d1b73a9a5014	MW	\N	\N	26Jul콜링우드A2_차지아-MW	26Jul콜링우드A2_차지아-MW-Jia CHA(Soyul KANG)
d440f5c0-aa75-4c7b-afab-673a3168f07e	2026 Aug-Melbourne_Oakleigh Schooling-C Package 2 Adult / 1 Child_Aejin CHOI	\N	\N	7300.00	AUD	active	\N	\N	\N	2026-04-11 09:19:46.145327	2026-04-11 09:19:46.145327	\N	0.00	\N	Jimin LEE	choiaejin@hotmail.com	한국	2026 Aug-Melbourne_Oakleigh Schooling	2026 Aug-Melbourne_Oakleigh Schooling-C Package 2 Adult / 1 Child	RED Uhak	\N	\N	\N	7300.00	1200.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	7c1001ee-2823-4b7a-aa4f-724debacfe1e	RD	\N	\N	26Aug오클리C3_최애진-RD	26Aug오클리C3_최애진-RD-Aejin CHOI(Jimin LEE)
a3e30696-0225-483e-a287-752aeeb9a200	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child_Uiji JO	\N	\N	9800.00	AUD	active	\N	\N	1 Adult & 1 Child\t3 Weeks\t$9,900\t1\t$9,900\nGrade 2 to Grade 10_Weekly\t1 Weeks\t$1,000\t3\t$3,000\nExtra Night - 1  Bedroom\tPer Night\t$175\t21\t$3,675\n2026 July Melbourne Schooling Total Fee_AUD $16,575\n$1,400 + $300 = $1,700	2026-04-11 09:20:45.986144	2026-04-11 09:20:45.986144	937.00	8863.00	\N	Suho YOO	112jo@naver.com	South Korea	2026 Jul-Melbourne_Collingwood Schooling	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child	MomWith	\N	\N	\N	9800.00	1400.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	f1c14431-49ce-47d9-ad44-52f9c87a43a4	MW	\N	\N	26Jul콜링우드A2_조의지-MW	26Jul콜링우드A2_조의지-MW-Uiji JO(Suho YOO)
a93da133-21f8-4958-8cd5-9993048fb1b8	2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child_Won Kyeong KIM	\N	\N	9900.00	AUD	active	\N	\N	\N	2026-04-11 09:20:54.256793	2026-04-11 09:20:54.256793	\N	9900.00	\N	Sehyun PARK	haneulsom@naver.com	South Korea	2026 Jul-Melbourne_Oakleigh Schooling	2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child	RED Uhak	\N	\N	\N	9900.00	1400.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	59e46538-3b62-4850-93c4-4e94273d4e7d	RD	\N	\N	26Jul오클리A2_김원경-RD	26Jul오클리A2_김원경-RD-Won Kyeong KIM(Sehyun PARK)
20b6c86c-3c39-48be-a9ed-fcce5ab702c6	2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child_Jihye YANG	\N	\N	9900.00	AUD	active	\N	\N	\N	2026-04-11 09:20:58.266142	2026-04-11 09:20:58.266142	\N	9900.00	\N	Ain SONG	jihye0709@gmail.com	South Korea	2026 Jul-Melbourne_Oakleigh Schooling	2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child	RED Uhak	\N	\N	\N	9900.00	1400.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	b9b71e06-3bd0-4594-a3b6-43609d12405f	RD	\N	\N	26Jul오클리A2_양지혜-RD	26Jul오클리A2_양지혜-RD-Jihye YANG(Ain SONG)
d76bea55-68fa-4a62-a537-a94a16902391	2026 Jul-Melbourne_Collingwood Schooling-D Package 2 Adult / 2 Child_Miyoung AN	\N	\N	18400.00	AUD	active	\N	\N	\N	2026-04-11 09:21:02.40557	2026-04-11 09:21:02.40557	1874.00	16526.00	\N	Sihun LEE,Younchan LEE,Yubin KIM	mmyung00@gmail.com	South Korea	2026 Jul-Melbourne_Collingwood Schooling	2026 Jul-Melbourne_Collingwood Schooling-D Package 2 Adult / 2 Child	Time Study	\N	\N	\N	18400.00	1650.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	b161e28d-7083-4a0a-a544-84330d82b771	TS	\N	\N	26Jul콜링우드D4_안미영-TS	26Jul콜링우드D4_안미영-TS-Miyoung AN(Sihun LEE, Younchan LEE, Yubin KIM)
27a7de5a-55cc-420f-bbb3-d39a985828a9	2026 Aug-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child_Ahhyun  SON	\N	\N	6600.00	AUD	active	\N	\N	\N	2026-04-11 09:19:50.02936	2026-04-11 09:19:50.02936	\N	0.00	\N	Yoonho JUN	sonahhyun@naver.com	South Korea	2026 Aug-Melbourne_Oakleigh Schooling	2026 Aug-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child	COEI (CHONGRO Overseas Educational Institute)	\N	\N	\N	6600.00	1000.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	c8a46edb-1da2-4634-87d8-c2c5004ee73e	CR	\N	\N	26Aug오클리A2_손아현-CR	26Aug오클리A2_손아현-CR-Ahhyun  SON(Yoonho JUN)
e5cf9530-24d2-435d-8b2b-9f70bf75d7ab	2026 Aug-Melbourne_Oakleigh Schooling-D Package 2 Adult / 2 Child_Tsz To FANG	\N	\N	10800.00	AUD	active	\N	\N	\N	2026-04-11 09:19:53.998343	2026-04-11 09:19:53.998343	\N	0.00	\N	Lok Yung Valerie PANG,Lok Yee Rachel PANG	doris.fang@gmail.com	Hong Kong	2026 Aug-Melbourne_Oakleigh Schooling	2026 Aug-Melbourne_Oakleigh Schooling-D Package 2 Adult / 2 Child	Time Study	\N	\N	\N	10800.00	1200.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	3e6288f4-b484-4bd8-9c8d-f31bd8435ba4	TS	\N	\N	26Aug오클리D4_Wing Tung, PANG-TS	26Aug오클리D4_Wing Tung, PANG-TS-Tsz To FANG(Lok Yung Valerie PANG, Lok Yee Rachel PANG)
bfc32694-5d78-4a94-aebb-87902d57154d	2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child_JIWON  EOM	\N	\N	14200.00	AUD	active	\N	\N	\N	2026-04-11 09:19:58.087178	2026-04-11 09:19:58.087178	\N	0.00	\N	DAMYUN PARK,SIYUN PARK	eumji0ju@gmail.com	서울	2026 Jul-Melbourne_Oakleigh Schooling	2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child	Lime Education	\N	\N	\N	14200.00	1600.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	981d81a6-09c1-4608-b5ec-0606804118a2	LE	\N	\N	26Jul오클리B3_엄지원-LE	26Jul오클리B3_엄지원-LE-JIWON  EOM(DAMYUN PARK, SIYUN PARK)
a80eef58-2a15-4a7d-8566-69fd824d2313	2026 Jul-Townsville_The Cathedral School -C Package 2 Adult / 1 Child_Youngmi Kim	\N	\N	11100.00	AUD	active	\N	\N	\N	2026-04-11 09:20:02.14485	2026-04-11 09:20:02.14485	\N	11100.00	\N	Hayul Jung	ym3jm@hanmail.net	대한민국	2026 Jul-Townsville_The Cathedral School	2026 Jul-Townsville_The Cathedral School -C Package 2 Adult / 1 Child	MomWith	\N	\N	\N	11100.00	1300.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	e4a7c62d-06b6-4b9f-aa44-28c45ff4bea0	MW	\N	\N	26Jul타운스빌C3_김영미-MW	26Jul타운스빌C3_김영미-MW-Youngmi Kim(Hayul Jung)
c1ed920a-cf61-4015-a0ba-bfc7fd25d2cd	2026 Jul-Melbourne_Collingwood Schooling-B Package 1 Adult / 2 Child_Ahyoung YOON	\N	\N	14200.00	AUD	active	\N	\N	오클리로 지원하셨으나, 콜링우드로 최종 희망.\n향후 1년 살기도 고려중\n첫재는 6학년 가능하나, 둘째는 현재 3학년에서 자리가 없으므로, 3, 4, 2학년 순으로 대기.\n계약금 200만원 입금 후\n4월 말 프로그램 최종 결정.	2026-04-11 09:20:06.071951	2026-04-11 09:20:06.071951	1874.00	12326.00	\N	Leah LIM,Noah LIM	yoonahyoung@gmail.com	South Korea	2026 Jul-Melbourne_Collingwood Schooling	2026 Jul-Melbourne_Collingwood Schooling-B Package 1 Adult / 2 Child	MomWith	\N	\N	\N	14200.00	1500.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	64280bf3-118e-49d8-a3f1-2f22a1149374	MW	\N	\N	26Jul콜링우드B3_윤아영-MW	26Jul콜링우드B3_윤아영-MW-Ahyoung YOON(Leah LIM, Noah LIM)
461c6292-fb62-41f1-840a-d8dcb94a2a89	2026 Jul-Melbourne_Collingwood Schooling-C Package 2 Adult / 1 Child_Jung Won SA	\N	\N	1120.00	AUD	active	\N	\N	콜링우드 지원.\n현재 4학년 -> 4학년, 3학년, 5학년 순으로 대기	2026-04-11 09:20:10.031554	2026-04-11 09:20:10.031554	\N	1120.00	\N	Min Jeong SA	harky00@naver.com	South Korea	2026 Jul-Melbourne_Collingwood Schooling	2026 Jul-Melbourne_Collingwood Schooling-C Package 2 Adult / 1 Child	RED Uhak	\N	\N	\N	1120.00	1500.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	3249845a-0d31-4074-99df-41778edb8f9a	RD	\N	\N	26Jul콜링우드C3_사정원-RD	26Jul콜링우드C3_사정원-RD-Jung Won SA(Min Jeong SA)
3cda3dcc-2c4b-46fb-90b4-4836227db98c	2026 Jul-Melbourne_Browns English Camp-A Package 1 Adult / 1 Child_Jia CHA	\N	\N	9700.00	AUD	active	\N	\N	\N	2026-04-11 09:20:14.051894	2026-04-11 09:20:14.051894	1000.00	8700.00	\N	Soyul KANG	sk2cha@naver.com	Republic of Korea	2026 Jul-Melbourne_Browns English Camp	2026 Jul-Melbourne_Browns English Camp-A Package 1 Adult / 1 Child	RED Uhak	\N	\N	\N	9700.00	1200.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	b336032b-65f3-4ae8-b135-c36161f5f0e3	RD	\N	\N	26Jul브라운스A1_차지아-RD	26Jul브라운스A1_차지아-RD-Jia CHA(Soyul KANG)
3c7871d3-6722-446b-bcc6-39722b7e443d	2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child_Min A LEE	\N	\N	14200.00	AUD	active	\N	\N	\N	2026-04-11 09:20:18.168906	2026-04-11 09:20:18.168906	\N	14200.00	\N	Sihyun LEE,Moongun LEE	mj212522@gmail.com	South Korea	2026 Jul-Melbourne_Oakleigh Schooling	2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child	Time Study	\N	\N	\N	14200.00	1600.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	87c97736-62e4-492a-9993-41ea65f9efe3	TS	\N	\N	26Jul오클리B3_이민아-TS	26Jul오클리B3_이민아-TS-Min A LEE(Sihyun LEE, Moongun LEE)
a82d9619-f105-405d-a1c7-5d51c4b1dcfc	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child_Hyeonhye HEO	\N	\N	9800.00	AUD	active	\N	\N	\N	2026-04-11 09:20:22.076468	2026-04-11 09:20:22.076468	937.00	8863.00	\N	Jihwan LEE	erinheo@gmail.com	South Korea	2026 Jul-Melbourne_Collingwood Schooling	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child	MomWith	\N	\N	\N	9800.00	1400.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	4d950a95-4e50-462e-bb51-f8c67c3e7cf3	MW	\N	\N	26Jul콜링우드A2_허현혜-MW	26Jul콜링우드A2_허현혜-MW-Hyeonhye HEO(Jihwan LEE)
6d77ec2e-2080-422e-a36f-3235fc1b20db	2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child_Seulgi LEE	\N	\N	14200.00	AUD	active	\N	\N	2026년 6월 12일부터 8월 7일까지 오클리 단기 스쿨링 수속을 이슬지 메니져가 도움 드릴게요. \n시현 2013.02.16 - 2026년 7학년 지원\n문건 2015.04.25 - 2026년 5학년 지원\n\n6월 12일 - 25일; 2주(9일)\n7월 14일 - 8월 7일; 4주(19일)\n총 6주(28일)	2026-04-11 09:20:26.056145	2026-04-11 09:20:26.056145	\N	14200.00	\N	Ajeong LIM,Woojoo LIM	dewgy@naver.com	South Korea	2026 Jul-Melbourne_Oakleigh Schooling	2026 Jul-Melbourne_Oakleigh Schooling-B Package 1 Adult / 2 Child	RED Uhak	\N	\N	\N	14200.00	1600.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	2fc14f4d-0925-4833-a445-1c46e105d942	RD	\N	\N	26Jul오클리B3_이슬기-RD	26Jul오클리B3_이슬기-RD-Seulgi LEE(Ajeong LIM, Woojoo LIM)
af574d96-22a4-40ac-80e6-38eb769abcc9	2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child_Kyungmi SON	\N	\N	9900.00	AUD	active	\N	\N	\N	2026-04-11 09:20:30.120534	2026-04-11 09:20:30.120534	\N	9900.00	\N	Layoon JEONG	skyward14@naver.com	South Korea	2026 Jul-Melbourne_Oakleigh Schooling	2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child	RED Uhak	\N	\N	\N	9900.00	1400.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	577673ab-326e-46f7-94f1-d69757460565	RD	\N	\N	26Jul오클리A2_손경미-RD	26Jul오클리A2_손경미-RD-Kyungmi SON(Layoon JEONG)
a701b69d-7dc0-43c1-bb76-e02c60e598da	2026 Jul-Melbourne_Collingwood Schooling-B Package 1 Adult / 2 Child_Eunyoung LEE	\N	\N	15000.00	AUD	active	\N	\N	\N	2026-04-11 09:20:34.052355	2026-04-11 09:20:34.052355	\N	15000.00	\N	Youngho LIU,Eunho LIU	clipall@naver.com	China	2026 Jul-Melbourne_Collingwood Schooling	2026 Jul-Melbourne_Collingwood Schooling-B Package 1 Adult / 2 Child	RED Uhak	\N	\N	\N	15000.00	1500.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	87321865-3f51-4cbb-bf10-ba37f98a05c0	RD	\N	\N	26Jul콜링우드B3_이은영-RD	26Jul콜링우드B3_이은영-RD-Eunyoung LEE(Youngho LIU, Eunho LIU)
c2cf71a6-8877-40f1-8685-16c7fd32e805	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child_Hyewon JEONG	\N	\N	9800.00	AUD	active	\N	\N	\N	2026-04-11 09:20:38.00365	2026-04-11 09:20:38.00365	937.00	8863.00	\N	Jeongyeon KIM	twinkle0826@naver.com	South Korea	2026 Jul-Melbourne_Collingwood Schooling	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child	Suho JO	\N	\N	\N	9800.00	1400.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	1ddce433-584f-4546-b905-7b9717fb6008	SH	\N	\N	26Jul콜링우드A2_정혜원-SH	26Jul콜링우드A2_정혜원-SH-Hyewon JEONG(Jeongyeon KIM)
ee54ee4c-5adf-4a40-acda-403c1bfced50	2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child_Kahyun KIM	\N	\N	9900.00	AUD	active	\N	\N	\N	2026-04-11 09:20:41.963352	2026-04-11 09:20:41.963352	\N	9900.00	\N	Seoyoon CHUNG	izzyggu0984@gmail.com	South Korea	2026 Jul-Melbourne_Oakleigh Schooling	2026 Jul-Melbourne_Oakleigh Schooling-A Package 1 Adult / 1 Child	RED Uhak	\N	\N	\N	9900.00	1400.00	\N	\N	\N	\N	\N	\N	\N	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	eb36728e-ef92-4e3a-974a-d7163ea438ac	RD	\N	\N	26Jul오클리A2_김가현-RD	26Jul오클리A2_김가현-RD-Kahyun KIM(Seoyoon CHUNG)
a89cbc95-af8a-42b5-b5af-7dcc28e764c6	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child_Taewon GU	\N	\N	9800.00	AUD	active	\N	\N	아이들의 얼굴이 나온 사진게시는 원하지 않습니다.	2026-04-11 09:21:06.321112	2026-04-11 09:21:06.321112	\N	9800.00	\N	Yul LEE	gtw0107@naver.com	South Korea	2026 Jul-Melbourne_Collingwood Schooling	2026 Jul-Melbourne_Collingwood Schooling-A Package 1 Adult / 1 Child	RED Uhak	\N	\N	\N	9800.00	1400.00	\N	\N	\N	\N	\N	\N	studyAbroad	t	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890	81b47002-e0c5-4262-9cc3-6dbdf52c0964	RD	총비용 9800 - 에이젼트 컴 1400 - 오민정님 컴 1400 제외하고 입금 예정.	\N	26Jul콜링우드A2_구태원-RD	26Jul콜링우드A2_구태원-RD-Taewon GU(Yul LEE)
cccc0001-0000-0000-0000-000000000001	CT-2026-001	\N	\N	16800.00	AUD	active	2026-07-01	2026-12-31	\N	2026-04-15 10:52:08.435027	2026-04-15 10:52:08.435027	8400.00	8400.00	2026-03-15	Kim Ji-won	jiwon.kim@example.com	South Korea	\N	ELICOS + Homestay Package	Test Agent Co	\N	2026-07-07	2026-12-19	16800.00	9600.00	\N	bbbb0001-0000-0000-0000-000000000001	1605af17-a158-4315-827c-472d33656a5f	\N	\N	\N	\N	t	b78f9499-7371-437d-b5ff-c294f557d13e	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	\N	\N	\N	\N	\N
cccc0003-0000-0000-0000-000000000003	CT-2026-003	\N	\N	8620.00	AUD	completed	2026-04-28	2026-07-18	\N	2026-04-15 10:52:08.435027	2026-04-15 10:52:08.435027	8620.00	0.00	2026-03-20	Lee Min-ji	minji.lee@example.com	South Korea	\N	Short ELICOS + Homestay	Test Agent Co	\N	2026-04-28	2026-07-18	8620.00	4800.00	\N	bbbb0003-0000-0000-0000-000000000003	1605af17-a158-4315-827c-472d33656a5f	\N	\N	\N	\N	t	b78f9499-7371-437d-b5ff-c294f557d13e	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	\N	\N	\N	\N	\N
cccc0004-0000-0000-0000-000000000004	CT-2026-004	\N	\N	5500.00	AUD	active	2026-05-05	2026-07-31	\N	2026-04-15 10:52:08.435027	2026-04-15 10:52:08.435027	2750.00	2750.00	2026-04-01	Kim Ji-won	jiwon.kim@example.com	South Korea	\N	English Bridge	Test Agent Co	\N	2026-05-05	2026-07-31	5500.00	3200.00	\N	\N	1605af17-a158-4315-827c-472d33656a5f	\N	\N	\N	\N	t	b78f9499-7371-437d-b5ff-c294f557d13e	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	\N	\N	\N	\N	\N
cccc0005-0000-0000-0000-000000000005	CT-2026-005	\N	\N	3200.00	AUD	completed	2026-01-15	2026-04-15	\N	2026-04-15 10:52:08.435027	2026-04-15 10:52:08.435027	3200.00	0.00	2025-12-20	Kim Ji-won	jiwon.kim@example.com	South Korea	\N	General English 12 Weeks	Test Agent Co	\N	2026-01-15	2026-04-15	3200.00	2000.00	\N	\N	1605af17-a158-4315-827c-472d33656a5f	\N	\N	\N	\N	t	b78f9499-7371-437d-b5ff-c294f557d13e	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N	\N	\N	\N	\N	\N
\.


ALTER TABLE myagency.contracts ENABLE TRIGGER ALL;

--
-- Data for Name: cost_centers; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.cost_centers DISABLE TRIGGER ALL;

COPY myagency.cost_centers (id, code, name, description, status, created_on, modified_on) FROM stdin;
\.


ALTER TABLE myagency.cost_centers ENABLE TRIGGER ALL;

--
-- Data for Name: document_access_logs; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.document_access_logs DISABLE TRIGGER ALL;

COPY myagency.document_access_logs (id, document_id, user_id, action, ip_address, user_agent, accessed_at) FROM stdin;
\.


ALTER TABLE myagency.document_access_logs ENABLE TRIGGER ALL;

--
-- Data for Name: document_categories; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.document_categories DISABLE TRIGGER ALL;

COPY myagency.document_categories (id, category_code, category_name_en, category_name_ko, category_name_ja, category_name_th, category_group, icon, is_required, sort_order, created_at, allow_extra_upload) FROM stdin;
\.


ALTER TABLE myagency.document_categories ENABLE TRIGGER ALL;

--
-- Data for Name: document_extra_categories; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.document_extra_categories DISABLE TRIGGER ALL;

COPY myagency.document_extra_categories (id, reference_type, reference_id, category_name, category_group, created_by, created_at) FROM stdin;
\.


ALTER TABLE myagency.document_extra_categories ENABLE TRIGGER ALL;

--
-- Data for Name: document_permissions; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.document_permissions DISABLE TRIGGER ALL;

COPY myagency.document_permissions (id, document_id, role, can_view, can_download, can_delete, created_at, can_upload_extra) FROM stdin;
\.


ALTER TABLE myagency.document_permissions ENABLE TRIGGER ALL;

--
-- Data for Name: documents; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.documents DISABLE TRIGGER ALL;

COPY myagency.documents (id, reference_type, reference_id, category_id, participant_id, document_name, original_filename, file_path, file_size_bytes, file_type, file_extension, version, is_latest_version, previous_version_id, status, expiry_date, rejection_reason, uploaded_by, reviewed_by, reviewed_at, notes, deleted_at, created_at, updated_at, extra_category_id, service_type, service_id, document_category, is_submitted, submitted_to) FROM stdin;
08906516-780a-44be-b3ec-ee43e8b4e37a	contract	cccc0001-0000-0000-0000-000000000001	\N	\N	Passport - Hyunjin Park	passport_hyunjin_park.pdf	https://www.africau.edu/images/default/sample.pdf	284000	application/pdf	pdf	1	t	\N	approved	2028-10-15	\N	\N	\N	\N	\N	\N	2026-01-10 09:00:00	2026-01-10 09:00:00	\N	\N	\N	PASSPORT	f	\N
e7592361-0a7f-4d91-894e-635911103a56	contract	cccc0001-0000-0000-0000-000000000001	\N	\N	IELTS Score Certificate	ielts_certificate_2026.pdf	https://www.africau.edu/images/default/sample.pdf	198000	application/pdf	pdf	1	t	\N	approved	2027-03-20	\N	\N	\N	\N	\N	\N	2026-01-15 11:30:00	2026-01-15 11:30:00	\N	\N	\N	ENGLISH_TEST	f	\N
42993bed-b8c0-4d0a-83c5-3ab502ac21b4	contract	cccc0001-0000-0000-0000-000000000001	\N	\N	ELICOS Offer Letter	offer_letter_elicos_2026.pdf	https://www.africau.edu/images/default/sample.pdf	156000	application/pdf	pdf	1	t	\N	active	2026-07-01	\N	\N	\N	\N	\N	\N	2026-02-01 14:00:00	2026-02-01 14:00:00	\N	\N	\N	OFFER_LETTER	f	\N
f2c9c3b9-7307-4121-aaec-105634fe2597	contract	cccc0004-0000-0000-0000-000000000004	\N	\N	Confirmation of Enrolment (COE)	COE_english_bridge_2026.pdf	https://www.africau.edu/images/default/sample.pdf	220000	application/pdf	pdf	1	t	\N	approved	2027-01-20	\N	\N	\N	\N	\N	\N	2026-03-05 10:00:00	2026-03-05 10:00:00	\N	\N	\N	COE	f	\N
d5b664f6-4202-4789-8bbf-34fa2102f181	contract	cccc0001-0000-0000-0000-000000000001	\N	\N	Overseas Student Health Cover (OSHC)	health_insurance_oshc_2026.pdf	https://www.africau.edu/images/default/sample.pdf	175000	application/pdf	pdf	1	t	\N	active	2027-07-15	\N	\N	\N	\N	\N	\N	2026-03-10 09:00:00	2026-03-10 09:00:00	\N	\N	\N	INSURANCE	f	\N
dfe2956b-bc11-4bb7-8faa-36c10bf73245	contract	cccc0002-0000-0000-0000-000000000002	\N	\N	University Pathway Offer Letter	offer_letter_university_pathway.pdf	https://www.africau.edu/images/default/sample.pdf	210000	application/pdf	pdf	1	t	\N	pending_review	\N	\N	\N	\N	\N	\N	\N	2026-04-01 08:00:00	2026-04-01 08:00:00	\N	\N	\N	OFFER_LETTER	f	\N
\.


ALTER TABLE myagency.documents ENABLE TRIGGER ALL;

--
-- Data for Name: enrollment_settings; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.enrollment_settings DISABLE TRIGGER ALL;

COPY myagency.enrollment_settings (id, package_group_id, is_spot_limited, display_on_landing, updated_at) FROM stdin;
\.


ALTER TABLE myagency.enrollment_settings ENABLE TRIGGER ALL;

--
-- Data for Name: enrollment_spots; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.enrollment_spots DISABLE TRIGGER ALL;

COPY myagency.enrollment_spots (id, package_group_id, grade_label, grade_order, total_spots, reserved_spots, manual_reserved, status, created_at, updated_at, start_date, end_date, dob_range_start, dob_range_end, enroll_name, note) FROM stdin;
25c7e6cd-f8fa-405a-9c9e-cc1c0403145c	3b3673f3-6fe8-4b28-9a8d-3f176df12409	Grade 1	1	3	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-08-08 00:00:00	2026-08-22 00:00:00	2019-05-01 00:00:00	2020-04-30 00:00:00	2026 Aug-Melbourne_Oakleigh Schooling-Grade 1	\N
a6325885-a5e7-4c03-a01a-c7790bca1ec2	3b3673f3-6fe8-4b28-9a8d-3f176df12409	Grade 3	2	1	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-08-08 00:00:00	2026-08-22 00:00:00	2017-05-01 00:00:00	2018-04-30 00:00:00	2026 Aug-Melbourne_Oakleigh Schooling-Grade 3	\N
3dafb658-02f2-42fa-9fc1-a302848391bf	3b3673f3-6fe8-4b28-9a8d-3f176df12409	Grade 4	3	3	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-08-08 00:00:00	2026-08-22 00:00:00	2016-05-01 00:00:00	2017-04-30 00:00:00	2026 Aug-Melbourne_Oakleigh Schooling-Grade 4	\N
b9863ab1-a7c3-4216-855e-d27f40aa1a94	3b3673f3-6fe8-4b28-9a8d-3f176df12409	Grade 5	4	3	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-08-08 00:00:00	2026-08-22 00:00:00	2015-05-01 00:00:00	2016-04-30 00:00:00	2026 Aug-Melbourne_Oakleigh Schooling-Grade 5	\N
3d5b2501-566d-443d-ba8c-6f1ebff76ffc	3b3673f3-6fe8-4b28-9a8d-3f176df12409	Grade 7	5	3	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-08-08 00:00:00	2026-08-22 00:00:00	2013-05-01 00:00:00	2014-04-30 00:00:00	2026 Aug-Melbourne_Oakleigh Schooling-Grade 7	\N
210bd58a-80f6-4e7f-8fb9-b29eabef1fd6	3b3673f3-6fe8-4b28-9a8d-3f176df12409	Grade 9	6	3	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-08-08 00:00:00	2026-08-22 00:00:00	2011-05-01 00:00:00	2012-04-30 00:00:00	2026 Aug-Melbourne_Oakleigh Schooling-Grade 9	\N
8a47c961-39fc-4590-a4c2-551c0eee7590	96c936cc-d3a1-4fb2-8d09-843c9350e64f	PSP (7-12 Years Old)	1	0	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-25 00:00:00	2026-08-15 00:00:00	\N	\N	2026 Jul-Melbourne_Browns English Camp-PSP (7-12 Years Old)	\N
8994fe5c-807f-412b-9742-949c23eb29b3	96c936cc-d3a1-4fb2-8d09-843c9350e64f	HSP (13-17 Years Old)	2	0	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-25 00:00:00	2026-08-15 00:00:00	\N	\N	2026 Jul-Melbourne_Browns English Camp-HSP (13-17 Years Old)	\N
ee13d9a0-102f-4358-a9ea-fdd95a96152f	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	Prep Steiner	1	2	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2020-05-01 00:00:00	2021-04-30 00:00:00	2026 Jul-Melbourne_Collingwood Schooling-Prep Steiner	\N
3a0da06a-560d-49e8-8b90-3e39ee9549ab	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	Steiner 1/2	2	2	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2019-05-01 00:00:00	2020-04-30 00:00:00	2026 Jul-Melbourne_Collingwood Schooling-Steiner 1/2	\N
28ae9686-fc27-4ef2-a84a-10fb27e96ece	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	Main Program 1/2	3	2	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2018-05-01 00:00:00	2020-04-30 00:00:00	2026 Jul-Melbourne_Collingwood Schooling-Main Program 1/2	\N
3472f3b8-115d-4c7d-897f-24228807107a	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	Steiner 3	4	2	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2017-05-01 00:00:00	2018-04-30 00:00:00	2026 Jul-Melbourne_Collingwood Schooling-Steiner 3	\N
362648a0-4ca7-49ea-b514-4f58a3306148	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	Steiner 4	5	2	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2016-05-01 00:00:00	2017-04-30 00:00:00	2026 Jul-Melbourne_Collingwood Schooling-Steiner 4	\N
4267154b-3627-4e23-8f04-fc2e5e646fd2	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	Steiner 5	6	2	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2015-05-01 00:00:00	2016-04-30 00:00:00	2026 Jul-Melbourne_Collingwood Schooling-Steiner 5	\N
f3411b36-91dd-4032-99c9-07ec99e65f4e	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	Steiner 6	7	2	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2014-05-01 00:00:00	2015-04-30 00:00:00	2026 Jul-Melbourne_Collingwood Schooling-Steiner 6	\N
884a0784-b9b7-406b-bb87-aca9dced92b4	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	Steiner 7	8	2	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2013-05-01 00:00:00	2014-04-30 00:00:00	2026 Jul-Melbourne_Collingwood Schooling-Steiner 7	\N
56fe50f2-0d5d-4b5b-8e4d-a81e55ae35f1	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	IB MYP 7	9	4	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2013-05-01 00:00:00	2014-04-30 00:00:00	2026 Jul-Melbourne_Collingwood Schooling-IB MYP 7	\N
07fa799b-8d86-4860-bbe6-e68a2dfdbaa9	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	Steiner 8	10	2	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2012-05-01 00:00:00	2013-04-30 00:00:00	2026 Jul-Melbourne_Collingwood Schooling-Steiner 8	\N
b3029d03-f0a0-4bb7-94ff-217bbd805833	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	Steiner 9	11	2	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2011-05-01 00:00:00	2012-04-30 00:00:00	2026 Jul-Melbourne_Collingwood Schooling-Steiner 9	\N
1e13f799-4f5f-4e3d-80d6-9149ca3c3248	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	IB MYP 9	12	4	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2011-05-01 00:00:00	2012-04-30 00:00:00	2026 Jul-Melbourne_Collingwood Schooling-IB MYP 9	\N
33e46317-0193-4e42-a01c-d67687f82eae	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	Grade 10	13	6	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2010-05-01 00:00:00	2011-04-30 00:00:00	2026 Jul-Melbourne_Collingwood Schooling-Grade 10	\N
3b5cc6ba-206e-4d80-8642-e1c6c7242079	3eda0426-7947-4640-a1fb-7f380179433d	Grade 1	1	3	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2019-05-01 00:00:00	2020-04-30 00:00:00	2026 Jul-Melbourne_Oakleigh Schooling-Grade 1	\N
7b209669-c1af-4888-a606-9b42bf79e40f	3eda0426-7947-4640-a1fb-7f380179433d	Grade 3	2	1	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2017-05-01 00:00:00	2018-04-30 00:00:00	2026 Jul-Melbourne_Oakleigh Schooling-Grade 3	\N
0590763c-7b91-4a2d-8f94-8730a828a429	3eda0426-7947-4640-a1fb-7f380179433d	Grade 4	3	3	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2016-05-01 00:00:00	2017-04-30 00:00:00	2026 Jul-Melbourne_Oakleigh Schooling-Grade 4	\N
a2d58555-5504-47e7-b703-9efa6a4c62bd	3eda0426-7947-4640-a1fb-7f380179433d	Grade 5	4	3	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2015-05-01 00:00:00	2016-04-30 00:00:00	2026 Jul-Melbourne_Oakleigh Schooling-Grade 5	\N
bc69c960-c2ae-4068-82cc-278e19329396	3eda0426-7947-4640-a1fb-7f380179433d	Grade 7	5	3	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2013-05-01 00:00:00	2014-04-30 00:00:00	2026 Jul-Melbourne_Oakleigh Schooling-Grade 7	\N
f0b954ca-19ae-4cf1-ac86-96bba6c6b63b	3eda0426-7947-4640-a1fb-7f380179433d	Grade 9	6	3	0	0	available	2026-04-17 06:01:35.469598	2026-04-17 06:01:35.469598	2026-07-18 00:00:00	2026-08-08 00:00:00	2011-05-01 00:00:00	2012-04-30 00:00:00	2026 Jul-Melbourne_Oakleigh Schooling-Grade 9	\N
\.


ALTER TABLE myagency.enrollment_spots ENABLE TRIGGER ALL;

--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.exchange_rates DISABLE TRIGGER ALL;

COPY myagency.exchange_rates (id, from_currency, to_currency, rate, source, effective_date, created_by, created_at) FROM stdin;
1b196643-8bc4-44df-8672-09dd5de30688	AUD	JPY	112.521664	auto	2026-04-12	30063c30-90e9-40d4-9b07-420065659873	2026-04-12 08:37:25.759185
04766493-a4a1-46ee-9878-b2b6cd450cd4	AUD	KRW	1047.427192	auto	2026-04-12	30063c30-90e9-40d4-9b07-420065659873	2026-04-12 08:37:12.853245
3a4377d2-2317-48e4-836d-48ab2a13f9eb	AUD	MYR	2.804309	auto	2026-04-12	30063c30-90e9-40d4-9b07-420065659873	2026-04-12 08:39:39.311733
7da524fe-cb7b-4b19-9448-00e4bbd54e8e	AUD	PHP	42.362967	auto	2026-04-12	30063c30-90e9-40d4-9b07-420065659873	2026-04-12 08:37:35.279604
25ab54ae-fb83-45d5-a0d7-b9760adf88c1	AUD	THB	22.668486	auto	2026-04-12	30063c30-90e9-40d4-9b07-420065659873	2026-04-12 08:37:43.913311
\.


ALTER TABLE myagency.exchange_rates ENABLE TRIGGER ALL;

--
-- Data for Name: form_terms_content; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.form_terms_content DISABLE TRIGGER ALL;

COPY myagency.form_terms_content (id, form_id, language, content, is_default, created_at, updated_at) FROM stdin;
abd9a8e7-f96f-4f4b-a558-6e39d3961420	52e23384-7810-4c33-a780-10ae6b43a72a	en	# Application Fee & Payment Guide\n## Deposit Payment\n- A deposit of **AUD $1,000 (per child)** is required upon program application\n- The deposit paid at the time of application is **non-refundable**\n- Exception: A full refund will be issued if placement at the school/institution is not confirmed\n## Balance Payment\n- The full remaining balance must be paid **no later than 3 months before the program start date**\n- Failure to meet the payment deadline may result in cancellation of program participation\n- Example: Program starts December 1 → Full payment due by August 30\n---\n## Flight Booking Guide\n- It is strongly recommended to confirm your flight and travel itinerary only after receiving the **Confirm Letter (Official Confirmation)**\n- Expected issuance of Confirm Letter: To be announced\n- Any losses incurred from booking flights prior to receiving the Confirm Letter are the sole responsibility of the applicant\n---\n## Cancellation & Refund Policy\n### Deposit\n- The deposit of **AUD $1,000 per child** paid at the time of application is **non-refundable**\n- **Exception:** Full refund if the program cannot proceed due to unconfirmed placement at the school/institution\n### Cancellation After Balance Payment\n- The deposit (contract fee) is non-refundable after the balance has been paid\n- Tuition, accommodation, and related costs will be processed according to the refund policy of the partner institution in the respective country, and refunds will be issued after applicable deductions\n- Refund policies vary by country and institution — please request individual guidance before applying\n### Cancellation More Than 3 Months Before Program Start\n- If cancelled more than 3 months before the program start date, a partial amount beyond the AUD $1,000 deposit may be non-refundable depending on the partner institution's policy\n- Eligibility for partial refunds follows the regulations of the partner institution in the respective country\n- Example: Program starts December 1 → Cancellation before August 30\n### Cancellation Within 3 Months of Program Start\n- If cancelled within 3 months of the program start date, **no refund will be issued**\n- Example: Program starts December 1 → Cancellation on or after September 1\n---\n## School Admission & Academic Guidelines\n### Final Decision Authority\n- All final decisions regarding school admission, class placement, and academic matters are at the **sole discretion of the relevant school/educational institution**\n- The agency acts solely in an advisory and application processing capacity; final admission approval rests with the school\n### Liability for Personal Losses\nNo compensation will be provided for personal losses resulting from decisions made by the school/institution, including:\n- Loss of time\n- Airfare costs\n- Visa application fees\n- Other incidental expenses\n> The agency explicitly bears no responsibility in relation to any of the above.\n---\n## Academic Schedule & Tuition Guidelines\n### Academic Calendar\n- All academic schedules follow the official academic calendar of the respective country and school\n- Academic calendars, semester divisions, and vacation periods vary by country\n### Holidays & School Closures\nIn the event that classes are not held due to school-designated closures or national public holidays:\n- No tuition refund will be provided\n- No make-up classes will be offered\nPublic holidays and special closure dates for each country will be communicated in advance.\n---\n## Disclaimer (Force Majeure)\n### Circumstances Beyond the Organizer's Control\nThe organizer bears no responsibility for refunds or related liabilities if the program is disrupted due to the following circumstances:\n**Natural Disasters & Force Majeure**\n- Natural disasters (earthquakes, typhoons, floods, etc.)\n- Spread of infectious disease or national emergency situations\n- War, terrorism, or political instability\n**Aviation & Transportation**\n- Flight delays or cancellations\n- Airline errors or operational issues\n- Transportation strikes or service disruptions\n**Personal Circumstances**\n- Changes in personal circumstances\n- Illness or health-related issues\n- Visa denial or delays\n**External Partners**\nThis disclaimer also applies to issues arising from the following external program partners:\n- Educational institutions (schools, language schools, camp operators)\n- Accommodation providers (homestays, dormitories, hotels)\n- Travel agencies and local operating partners\n- Transportation and activity providers\n---\n## Camp Photo & Video Copyright\n### Copyright Ownership\n- All rights to photos and videos taken during the camp and program period are **owned by the camp operator**\n### Consent to Use\n- It is assumed that participants raise no objection to photos and videos being published online or offline\n- Purposes of publication include: program promotion, educational materials, website/SNS content, etc.\n- If you do not wish to have your photos or videos published, please **specify this explicitly at the time of application**	t	2026-04-13 06:51:07.10207	2026-04-13 06:58:20.353
47c2a4ea-3224-4114-9a10-038a9dd25ecd	52e23384-7810-4c33-a780-10ae6b43a72a	ko	# 신청금 및 납부 안내\n## 예약금 납부\n- 프로그램 신청 시 한자녀당 예약금 **한화 100만원**이 필요합니다\n- 신청 시 납부하신 예약금은 **환불 불가** 항목입니다\n- 단, 학교/기관의 자리 미확정 시 전액 환불 됩니다\n## 잔금 납부\n- 잔금은 프로그램 시작일 기준 **3개월 전까지** 전액 납부해야 합니다\n- 납부 기한 미준수 시 프로그램 참가가 취소될 수 있습니다\n- 예) 12월 1일 프로그램시작 → 8월 30일까지 납부\n---\n## 항공권 예약 안내\n- **Confirm Letter(확정서) 수령 후** 항공권 및 여행 일정을 확정하시길 강력히 권장드립니다\n- 확정서 발급 예정 시기: 00월 예정\n- 확정서 수령 전 항공권 예약으로 인한 손실은 본인 부담입니다\n---\n## 취소 및 환불 정책\n### 예약금 관련\n- 프로그램 신청 시 납부한 한자녀당 예약금 **한화 100만원은 환불되지 않습니다**\n- **예외:** 학교/기관의 자리 미확정으로 프로그램 진행이 불가능한 경우 전액 환불\n### 잔금 납부 후 취소\n- 잔금 납부 후 계약금(예약금)은 환불 불가합니다\n- 학비, 숙소 및 관련 비용은 해당 국가 파트너 기관의 환불 규정에 따라 처리되며, 규정에 따라 공제 후 환불됩니다\n- 각 국가 및 기관별 환불 규정이 상이하므로 신청 전 개별 안내를 받으시기 바랍니다\n### 프로그램 시작 3개월 이전 취소\n- 프로그램 시작일 기준 3개월 이전에(3개월 이상 남은) 취소하는 경우, 예약금 100만원 외 파트너 기관의 정책에 따라 일부 금액이 환불이 불가능할 수 있습니다\n- 부분 환불 가능 여부는 해당 국가 파트너 기관의 규정을 따릅니다\n- 예) 12월 1일 프로그램시작 → 8월 30일 이전 취소 시\n### 프로그램 시작 3개월 이내 취소\n- 프로그램 시작일 기준 3개월 이내에 취소하는 경우, **전액 환불이 불가**합니다\n- 예) 12월 1일 프로그램시작 → 9월 1일 이후 취소 시\n---\n## 학교 입학 및 학업 관련 안내사항\n### 최종 결정 권한\n- 학교 입학, 반 배정, 학업 관련 모든 최종 결정은 해당 학교/교육기관의 판단에 따라 이루어집니다\n- 유학원은 추천 및 신청 대행 역할을 수행하며, 최종 입학 허가는 학교의 권한입니다\n### 개인적 손실에 대한 책임\n학교/기관의 결정으로 인해 발생할 수 있는 개인적 손실에 대한 피해 보상은 제공되지 않습니다:\n- 시간적 손실\n- 항공료\n- 비자 발급 비용\n- 기타 부대비용\n> 본 대행업체는 이와 관련하여 어떠한 책임도 지지 않음을 명시합니다.\n---\n## 학사 일정 및 수업료 관련 안내\n### 학사 일정\n- 모든 학사 일정은 해당 국가 및 학교의 공식 학업 일정을 따릅니다\n- 국가별로 학사 일정, 학기 구분, 방학 기간이 상이합니다\n### 휴무일 및 공휴일\n학교 지정 휴무일 및 국가 공휴일로 인해 수업이 진행되지 않는 경우에도:\n- 수업료 환불 불가\n- 대체 수업 제공 불가\n각 국가의 공휴일 및 특별 휴무일은 사전 안내드립니다\n---\n## 면책 조항 (불가항력 사유)\n### 주최 측 통제 불가능한 상황\n다음과 같은 사유로 프로그램이 원활히 진행되지 못할 경우, 주최자는 환불 또는 관련 책임을 지지 않습니다:\n**자연재해 및 불가항력**\n- 자연재해 (지진, 태풍, 홍수 등)\n- 전염병 확산 및 국가적 재난 상황\n- 전쟁, 테러, 정치적 불안\n**항공 및 교통 관련**\n- 항공편 지연 또는 취소\n- 항공사의 실수 또는 운영 문제\n- 교통 파업 및 운송 중단\n**개인적 사유**\n- 개인적인 사정 변경\n- 질병 및 건강 문제\n- 비자 발급 거부 또는 지연\n**외부 파트너 관련**\n이 면책 조항은 다음 외부 프로그램 파트너의 문제로 인한 경우에도 적용됩니다:\n- 교육기관 (학교, 어학원, 캠프 운영 기관)\n- 숙소 제공자 (홈스테이, 기숙사, 호텔)\n- 여행사 및 현지 운영 파트너\n- 교통 및 액티비티 제공 업체\n---\n## 캠프 사진 및 영상 저작권\n### 저작권 소유\n- 캠프 및 프로그램 기간 동안 촬영된 모든 사진과 영상의 저작권은 **캠프 운영 측**에 있습니다\n### 사용 동의\n- 촬영된 사진 및 영상이 온라인 또는 오프라인에 게시되는 것에 대해 별도의 이의를 제기하지 않는 것으로 간주됩니다\n- 게시 목적: 프로그램 홍보, 교육 자료, 웹사이트/SNS 콘텐츠 등\n- 게시를 원하지 않으실 경우 **신청 시 별도로 명시**해 주시기 바랍니다	f	2026-04-13 06:50:41.28185	2026-04-13 06:58:53.283
\.


ALTER TABLE myagency.form_terms_content ENABLE TRIGGER ALL;

--
-- Data for Name: guardian_mgt; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.guardian_mgt DISABLE TRIGGER ALL;

COPY myagency.guardian_mgt (id, contract_id, lead_id, student_account_id, assigned_staff_id, guardian_staff_id, service_start_date, service_end_date, billing_cycle, school_id, official_guardian_registered, school_guardian_registration_date, monthly_reports, parent_contact, emergency_contact, school_events_attended, medical_emergencies, welfare_interventions, status, notes, created_at, updated_at, service_fee, is_active) FROM stdin;
\.


ALTER TABLE myagency.guardian_mgt ENABLE TRIGGER ALL;

--
-- Data for Name: import_history; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.import_history DISABLE TRIGGER ALL;

COPY myagency.import_history (id, table_name, filename, total_rows, success_rows, error_rows, status, error_details, imported_by, created_at) FROM stdin;
\.


ALTER TABLE myagency.import_history ENABLE TRIGGER ALL;

--
-- Data for Name: internship_mgt; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.internship_mgt DISABLE TRIGGER ALL;

COPY myagency.internship_mgt (id, contract_id, lead_id, student_account_id, assigned_staff_id, english_level, work_experience, preferred_industry, available_hours_per_week, host_company_id, position_title, employment_type, hourly_rate, resume_prepared, cover_letter_prepared, interview_date, interview_result, start_date, end_date, placement_fee_type, reference_letter_issued, status, notes, created_at, updated_at, is_active) FROM stdin;
\.


ALTER TABLE myagency.internship_mgt ENABLE TRIGGER ALL;

--
-- Data for Name: interview_schedules; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.interview_schedules DISABLE TRIGGER ALL;

COPY myagency.interview_schedules (id, application_id, package_group_id, interviewer_id, scheduled_datetime, timezone, format, meeting_link, location, status, result, interviewer_notes, candidate_notes, created_at, updated_at, study_abroad_id) FROM stdin;
\.


ALTER TABLE myagency.interview_schedules ENABLE TRIGGER ALL;

--
-- Data for Name: interview_settings; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.interview_settings DISABLE TRIGGER ALL;

COPY myagency.interview_settings (id, package_group_id, is_required, format, duration_minutes, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE myagency.interview_settings ENABLE TRIGGER ALL;

--
-- Data for Name: invoices; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.invoices DISABLE TRIGGER ALL;

COPY myagency.invoices (id, invoice_number, contract_id, invoice_type, recipient_id, line_items, subtotal, tax_amount, total_amount, original_currency, original_amount, aud_equivalent, exchange_rate_to_aud, rate_applied_at, currency, status, issued_at, due_date, paid_at, notes, created_by, created_at, updated_at, ledger_entry_id, finance_item_id, agent_id, commission_amount, net_amount, parent_invoice_id, is_recurring, recurring_cycle, recurring_seq, contract_product_id, balance_due, ar_status, invoice_ref, school_account_id, student_account_id, program_name, student_name, course_start_date, course_end_date, is_gst_free, pdf_url, sent_to_email, sent_at, organisation_id) FROM stdin;
\.


ALTER TABLE myagency.invoices ENABLE TRIGGER ALL;

--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.journal_entries DISABLE TRIGGER ALL;

COPY myagency.journal_entries (id, entry_date, payment_header_id, debit_coa, credit_coa, amount, description, student_account_id, partner_id, staff_id, contract_id, invoice_id, entry_type, auto_generated, created_by, created_on, payment_line_id) FROM stdin;
\.


ALTER TABLE myagency.journal_entries ENABLE TRIGGER ALL;

--
-- Data for Name: kpi_targets; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.kpi_targets DISABLE TRIGGER ALL;

COPY myagency.kpi_targets (id, staff_id, team_id, period_type, target_amount, incentive_type, incentive_rate, incentive_fixed, valid_from, valid_to, description, status, created_by, created_on, modified_on) FROM stdin;
\.


ALTER TABLE myagency.kpi_targets ENABLE TRIGGER ALL;

--
-- Data for Name: lead_activities; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.lead_activities DISABLE TRIGGER ALL;

COPY myagency.lead_activities (id, lead_id, channel, scheduled_at, description, created_by, created_on, organisation_id) FROM stdin;
715fac98-83d1-4267-bd36-694d60b072c7	aaaa0001-0000-0000-0000-000000000001	Phone	\N	Initial consultation call — student interested in Melbourne universities	\N	2026-03-17 10:51:24.335292	a1b2c3d4-e5f6-7890-abcd-ef1234567890
2bc2d2e6-8cfc-4c08-8e87-2d5ed7612057	aaaa0001-0000-0000-0000-000000000001	Email	\N	Sent program brochure and fee schedule	\N	2026-03-21 10:51:24.335292	a1b2c3d4-e5f6-7890-abcd-ef1234567890
27872b8b-fa33-40dd-84f2-68a6dedeb5a9	aaaa0002-0000-0000-0000-000000000002	Phone	\N	Discussed accommodation preferences and budget	\N	2026-04-01 10:51:24.335292	a1b2c3d4-e5f6-7890-abcd-ef1234567890
480dc939-e0dd-405c-9299-d4837dd2eff4	aaaa0002-0000-0000-0000-000000000002	Note	\N	Student prefers single room homestay near city	\N	2026-04-05 10:51:24.335292	a1b2c3d4-e5f6-7890-abcd-ef1234567890
f5197497-bc09-43bb-b38f-100bdb44d51d	aaaa0003-0000-0000-0000-000000000003	Video Call	\N	Presented package options via Zoom	\N	2026-04-09 10:51:24.335292	a1b2c3d4-e5f6-7890-abcd-ef1234567890
df068428-7fec-447b-8402-cab07649e625	aaaa0003-0000-0000-0000-000000000003	Note	\N	Student ready to sign — follow up Monday	\N	2026-04-13 10:51:24.335292	a1b2c3d4-e5f6-7890-abcd-ef1234567890
\.


ALTER TABLE myagency.lead_activities ENABLE TRIGGER ALL;

--
-- Data for Name: leads; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.leads DISABLE TRIGGER ALL;

COPY myagency.leads (id, agent_id, full_name, email, phone, nationality, source, interested_in, status, notes, created_at, updated_at, lead_ref_number, assigned_staff_id, inquiry_type, budget, expected_start_date, contact_id, account_id, first_name, last_name, english_name, original_name, is_active, organisation_id, staff_note) FROM stdin;
aaaa0001-0000-0000-0000-000000000001	\N	Kim Ji-won	jiwon.kim@example.com	+82-10-1234-5678	Korean	Website	\N	qualified	Interested in university pathway	2026-03-16 10:51:24.33004	2026-04-15 10:51:24.33004	LD-2026-001	\N	\N	\N	\N	\N	b78f9499-7371-437d-b5ff-c294f557d13e	Ji-won	Kim	\N	\N	t	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N
aaaa0002-0000-0000-0000-000000000002	\N	Park Seo-jun	seojun.park@example.com	+82-10-9876-5432	Korean	Referral	\N	new	Looking for accommodation options	2026-03-31 10:51:24.33004	2026-04-15 10:51:24.33004	LD-2026-002	\N	\N	\N	\N	\N	b78f9499-7371-437d-b5ff-c294f557d13e	Seo-jun	Park	\N	\N	t	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N
aaaa0003-0000-0000-0000-000000000003	\N	Lee Min-ji	minji.lee@example.com	+82-10-5555-7777	Korean	Social Media	\N	proposal	Ready to receive a quote	2026-04-08 10:51:24.33004	2026-04-15 10:51:24.33004	LD-2026-003	\N	\N	\N	\N	\N	b78f9499-7371-437d-b5ff-c294f557d13e	Min-ji	Lee	\N	\N	t	a1b2c3d4-e5f6-7890-abcd-ef1234567890	\N
\.


ALTER TABLE myagency.leads ENABLE TRIGGER ALL;

--
-- Data for Name: notes; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.notes DISABLE TRIGGER ALL;

COPY myagency.notes (id, entity_type, entity_id, note_type, content, visibility, is_pinned, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE myagency.notes ENABLE TRIGGER ALL;

--
-- Data for Name: notifications; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.notifications DISABLE TRIGGER ALL;

COPY myagency.notifications (id, user_id, type, title, message, reference_type, reference_id, is_read, created_at) FROM stdin;
2c9a5a1f-d795-4238-9924-db0f265ef14e	1c3b5b5d-1c4f-4cb0-b941-7c9051dfb833	task_assigned	Task Assigned	Task TSK-2026-9425 has been assigned to you	task	13d11f08-a129-4498-935f-68b3a31a54b0	f	2026-04-19 11:12:43.848803
\.


ALTER TABLE myagency.notifications ENABLE TRIGGER ALL;

--
-- Data for Name: other_services_mgt; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.other_services_mgt DISABLE TRIGGER ALL;

COPY myagency.other_services_mgt (id, contract_id, assigned_staff_id, partner_id, service_type, title, start_date, end_date, status, service_fee, ap_cost, notes, created_at, updated_at, is_active) FROM stdin;
\.


ALTER TABLE myagency.other_services_mgt ENABLE TRIGGER ALL;

--
-- Data for Name: package_group_images; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.package_group_images DISABLE TRIGGER ALL;

COPY myagency.package_group_images (id, package_group_id, image_url, is_primary, sort_order, created_at) FROM stdin;
baf85ea0-d1c0-4416-97c8-3a6fdd39e1e0	686ac69b-d22c-4ac9-9e43-259e401fbdea	https://images.unsplash.com/photo-1468254095679-bbcba94a7066?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
72403ccd-3892-47de-ac5a-772e0223ddef	12e08ebd-4001-4f29-9978-a9e94291e207	https://images.unsplash.com/photo-1468254095679-bbcba94a7066?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
75547823-3103-4bb4-9016-91ec4d8b7f69	4946a81c-7300-4120-952a-fcdbec919786	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
8ed41e5b-c3b1-434d-9e7d-35399d365194	ffa24269-2627-494c-9967-b7b9b51f55c8	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
d6bfea4c-97fd-4ba6-85a7-1396d02980d1	6c413a67-f120-4421-af6f-e0f674a4a46b	https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
173d2d7b-05e8-4bce-8130-c2ea0bf5d7cb	98d48032-f45c-4ae2-8942-3f8d0c1a047d	https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
547cde0a-e3d4-47bb-b67b-08961fe9504d	db62d171-7d0b-43b4-8bef-b68a5e6edc8c	https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
4f855417-3f95-44a7-a9bd-da81f8db6863	9a925fe7-2001-43c4-8890-446ce478db06	https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
7480f7d7-e271-4ca9-bfe9-0205a54aa502	44c3e9da-6ee7-4fae-91e7-eca92062fba5	https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
14c65680-b493-46c2-8ad0-7d322c9667bf	490c3529-6984-45b1-a5ee-8cd6c9adfe67	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
bc9f0057-457b-419f-a4b1-af8e1a4c2feb	9f76ad68-b525-4f3f-a058-75dd69f32fec	https://images.unsplash.com/photo-1535572290543-960a8046f5af?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
dd58df28-5f9d-42ed-850c-62dfcf3ee115	19192829-d8c6-4a7d-9d36-a1ab1654edd8	https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
105e41a0-1ae1-46d9-84cc-cac2311fa421	4db03171-d1be-4065-a110-21cc388e233a	https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
c6701559-70e1-410f-b1f3-e327d7bd5c4d	77facf01-4839-4286-b13e-322a7ff2dd78	https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
e33b6224-6480-467e-979d-fd4516407b48	96c936cc-d3a1-4fb2-8d09-843c9350e64f	https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
1404f89a-44d7-4ef6-9e8b-524a1abb1ba3	f3da2590-9971-4c62-aa79-5906024e16d2	https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
9f95d139-c807-4056-9f9d-7f53728810c8	f8ca6e7b-5ab7-48df-8b22-fa3473640170	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
7e970008-90c1-47ce-a0fc-b636fb4f6f52	835b2dc0-3ad9-40f3-a0e1-639cb2be35d0	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
7dc0ccb0-0022-4912-99da-e417caa19f2d	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	t	0	2026-04-11 16:19:34.178013+00
c6e50043-3815-4794-9c26-cbc635c5c510	4946a81c-7300-4120-952a-fcdbec919786	https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
431616d5-fba4-482d-b7a9-3f273b06a4a6	4946a81c-7300-4120-952a-fcdbec919786	https://images.unsplash.com/photo-1587474260584-136574e423ef?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
34ea9834-37cb-41af-9c0d-222b47ecd5da	4946a81c-7300-4120-952a-fcdbec919786	https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
888a0d2b-85d8-4a16-b505-05e445b70501	4946a81c-7300-4120-952a-fcdbec919786	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
b174b369-ab16-4756-8b8c-c2e15bae3610	490c3529-6984-45b1-a5ee-8cd6c9adfe67	https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
fb033feb-2867-4619-9618-d17b7909d9aa	490c3529-6984-45b1-a5ee-8cd6c9adfe67	https://images.unsplash.com/photo-1587474260584-136574e423ef?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
460c25e0-6f27-4a56-bbf6-6a5e9ebaa7a6	490c3529-6984-45b1-a5ee-8cd6c9adfe67	https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
94199976-b27a-48cd-9117-2b60ab3c1513	490c3529-6984-45b1-a5ee-8cd6c9adfe67	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
46914f9f-207b-4f3d-8ac6-b4d08c53214e	ffa24269-2627-494c-9967-b7b9b51f55c8	https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
85b5098f-9235-4c15-b00f-a4dbc03c312c	ffa24269-2627-494c-9967-b7b9b51f55c8	https://images.unsplash.com/photo-1587474260584-136574e423ef?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
9778bf07-f5a8-4146-868d-08f6bbd0516b	ffa24269-2627-494c-9967-b7b9b51f55c8	https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
7249fca5-401d-434f-bb17-4a7c6d579c31	ffa24269-2627-494c-9967-b7b9b51f55c8	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
28ae4f74-fded-42fe-935d-a7fbdf1d8b02	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
190aa558-e3d9-4cf8-badf-934d128e870f	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	https://images.unsplash.com/photo-1587474260584-136574e423ef?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
4e5ec018-bcf0-4b3a-b0a9-52b5702ce251	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
750283ae-785a-4ebc-bee8-d70a657537ab	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
f1174789-5c9a-448f-a10d-244adb44e5af	f8ca6e7b-5ab7-48df-8b22-fa3473640170	https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
65c42bce-a746-4e19-82cb-2bbb065f4134	f8ca6e7b-5ab7-48df-8b22-fa3473640170	https://images.unsplash.com/photo-1587474260584-136574e423ef?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
62f9c71c-d67f-4ae8-b270-5f4f6621abb5	f8ca6e7b-5ab7-48df-8b22-fa3473640170	https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
ca563dc4-053e-477c-a128-c410cc685ebf	f8ca6e7b-5ab7-48df-8b22-fa3473640170	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
e5d017ce-8126-4440-912a-28ba1d456e59	3b3673f3-6fe8-4b28-9a8d-3f176df12409	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	f	0	2026-04-11 16:19:34.178013+00
c63e4070-bead-4465-80a5-f5e82b54f378	3b3673f3-6fe8-4b28-9a8d-3f176df12409	https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
c39fc5da-74f5-4fc2-bfa7-c9a16ddbe991	3b3673f3-6fe8-4b28-9a8d-3f176df12409	https://images.unsplash.com/photo-1587474260584-136574e423ef?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
ad632f34-0b53-4132-82b5-28076c9412d6	3b3673f3-6fe8-4b28-9a8d-3f176df12409	https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
742f0a4c-be19-4f30-aa6b-6c81b9099ee7	3b3673f3-6fe8-4b28-9a8d-3f176df12409	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	t	4	2026-04-11 16:41:12.6387+00
be3dd169-03f8-45ff-b498-563d2888a73c	835b2dc0-3ad9-40f3-a0e1-639cb2be35d0	https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
ec623c57-ff4e-4d8f-a589-33d4a2879130	835b2dc0-3ad9-40f3-a0e1-639cb2be35d0	https://images.unsplash.com/photo-1587474260584-136574e423ef?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
c7936b39-3007-4fc9-bddc-ffb3f1fb8291	835b2dc0-3ad9-40f3-a0e1-639cb2be35d0	https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
67ffbc4a-5abf-4944-9f81-2e42c1428635	835b2dc0-3ad9-40f3-a0e1-639cb2be35d0	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
3124dd4c-0134-47f3-94f4-6c66462e8a65	6c413a67-f120-4421-af6f-e0f674a4a46b	https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
0057085e-b593-479b-b4bd-31a97928f2c2	6c413a67-f120-4421-af6f-e0f674a4a46b	https://images.unsplash.com/photo-1587474260584-136574e423ef?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
c4ea0c86-20e1-4957-95d2-10dfec5aa68c	6c413a67-f120-4421-af6f-e0f674a4a46b	https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
4fed340c-e67c-43c2-8012-18ba609c6ff3	6c413a67-f120-4421-af6f-e0f674a4a46b	https://images.unsplash.com/photo-1546410531-fdff5db53836?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
9c4b546a-9277-4ba8-83dd-87db875903b1	96c936cc-d3a1-4fb2-8d09-843c9350e64f	https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
b68645a4-2b7f-4b13-8ada-c817560aea90	96c936cc-d3a1-4fb2-8d09-843c9350e64f	https://images.unsplash.com/photo-1587474260584-136574e423ef?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
46520b63-09ca-445a-ac97-f551a1f05908	96c936cc-d3a1-4fb2-8d09-843c9350e64f	https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
11c9ba64-7f06-4886-828b-b5e612943f1b	96c936cc-d3a1-4fb2-8d09-843c9350e64f	https://images.unsplash.com/photo-1546410531-fdff5db53836?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
5bc00798-302f-4b6b-abbd-36b1f38c6e48	686ac69b-d22c-4ac9-9e43-259e401fbdea	https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
fdf57ef8-d9f3-40a6-9bc5-616d3039e110	686ac69b-d22c-4ac9-9e43-259e401fbdea	https://images.unsplash.com/photo-1587474260584-136574e423ef?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
0ada13ae-8b71-4ebd-b4fe-355ada63191e	686ac69b-d22c-4ac9-9e43-259e401fbdea	https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
21dbe544-5f39-4bd0-bd3f-ad4cffb3c6fa	686ac69b-d22c-4ac9-9e43-259e401fbdea	https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
a5638548-0e53-4d15-aabb-524ff7583a04	12e08ebd-4001-4f29-9978-a9e94291e207	https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
805947f0-09c0-4e5a-8973-a17975aa733f	12e08ebd-4001-4f29-9978-a9e94291e207	https://images.unsplash.com/photo-1587474260584-136574e423ef?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
a6bd64cf-3635-4f01-94b8-8dbbea8daf69	12e08ebd-4001-4f29-9978-a9e94291e207	https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
f3be8fcf-4fe0-4b28-8285-cc14b6a0854e	12e08ebd-4001-4f29-9978-a9e94291e207	https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
53659831-aa79-4845-8dee-692120f04c88	9a925fe7-2001-43c4-8890-446ce478db06	https://images.unsplash.com/photo-1523482580672-768b4a2e4b35?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
fcdd3fd6-02fd-4a4e-8823-8c828617c0f7	9a925fe7-2001-43c4-8890-446ce478db06	https://images.unsplash.com/photo-1530866495561-2c76b3cb3d23?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
1ebb8059-1f89-49c8-bd1d-a040356c5c0b	9a925fe7-2001-43c4-8890-446ce478db06	https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
2ee90118-cbd1-4846-bb65-eee4ef1fc8aa	9a925fe7-2001-43c4-8890-446ce478db06	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
dacc7f59-b3c9-45d4-b7b9-5199d9cfbeb5	f3da2590-9971-4c62-aa79-5906024e16d2	https://images.unsplash.com/photo-1523482580672-768b4a2e4b35?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
a1e954e4-4ac4-4463-bf0d-692c338e3ca4	f3da2590-9971-4c62-aa79-5906024e16d2	https://images.unsplash.com/photo-1530866495561-2c76b3cb3d23?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
a941bdad-0bc7-4ad1-8992-e4d7cfae14a0	f3da2590-9971-4c62-aa79-5906024e16d2	https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
2870e7a0-e92b-48a9-9191-17e414c7779c	f3da2590-9971-4c62-aa79-5906024e16d2	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
a9e40283-61a5-4384-bb26-e3a46e925b77	9f76ad68-b525-4f3f-a058-75dd69f32fec	https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
2577bffb-2e0e-42da-b39b-2a10712f349a	9f76ad68-b525-4f3f-a058-75dd69f32fec	https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
8e0308aa-4332-4d88-8381-21aaf1703682	9f76ad68-b525-4f3f-a058-75dd69f32fec	https://images.unsplash.com/photo-1465778893808-9b3e4e0e5b26?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
3c0d4a16-5084-4b9c-8c54-50b11be6cedd	9f76ad68-b525-4f3f-a058-75dd69f32fec	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
19fe225a-022b-4a72-99c2-80988012142a	98d48032-f45c-4ae2-8942-3f8d0c1a047d	https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
28ce26d6-e0a0-4dc1-a3bb-a2a0b7f5c7fb	98d48032-f45c-4ae2-8942-3f8d0c1a047d	https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
c7d34081-9949-4491-b2ec-915384dbe27d	98d48032-f45c-4ae2-8942-3f8d0c1a047d	https://images.unsplash.com/photo-1465778893808-9b3e4e0e5b26?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
d910f109-f380-4de4-8602-b4e0005bb68d	98d48032-f45c-4ae2-8942-3f8d0c1a047d	https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
f035fc2f-0919-4514-b194-67ca3e8e20d3	db62d171-7d0b-43b4-8bef-b68a5e6edc8c	https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
72fb80af-3cc9-4493-867e-e51e6815ce9d	db62d171-7d0b-43b4-8bef-b68a5e6edc8c	https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
e8d70a07-fa0f-4eb2-aa4a-90cb26fb4aed	db62d171-7d0b-43b4-8bef-b68a5e6edc8c	https://images.unsplash.com/photo-1465778893808-9b3e4e0e5b26?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
361fd678-d213-4a17-a0c9-7467d661e7c3	db62d171-7d0b-43b4-8bef-b68a5e6edc8c	https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
8e227b1f-c164-4ae0-9ce0-07db3b6bca3f	19192829-d8c6-4a7d-9d36-a1ab1654edd8	https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
6f97bf1f-1763-407c-ac31-d9d9356358cd	19192829-d8c6-4a7d-9d36-a1ab1654edd8	https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
cf088396-109b-4a67-b9b7-f1ed7ac5f321	19192829-d8c6-4a7d-9d36-a1ab1654edd8	https://images.unsplash.com/photo-1541560052-77ec1bbc09f7?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
e1c0b760-8ebd-4cb7-af73-011d67b9a64a	19192829-d8c6-4a7d-9d36-a1ab1654edd8	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
4e26fe6e-d24d-4693-a9d3-92415bfc1dc7	4db03171-d1be-4065-a110-21cc388e233a	https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
eb9417d6-68d8-4ccd-ab64-ccd38239b6fb	4db03171-d1be-4065-a110-21cc388e233a	https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
5787afd4-c7b9-4503-a8bc-f0340040498b	4db03171-d1be-4065-a110-21cc388e233a	https://images.unsplash.com/photo-1541560052-77ec1bbc09f7?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
cb0a8281-9e89-4c2a-8e0c-8c51bb6d3bb9	4db03171-d1be-4065-a110-21cc388e233a	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
ec9d0f9c-ad89-47bb-95b0-ef3be5bf4561	44c3e9da-6ee7-4fae-91e7-eca92062fba5	https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
f20e0061-8ce3-4701-862c-6ef1f1357180	44c3e9da-6ee7-4fae-91e7-eca92062fba5	https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
77a16a4d-9f5e-40a6-98f2-0351dfdaee62	44c3e9da-6ee7-4fae-91e7-eca92062fba5	https://images.unsplash.com/photo-1541560052-77ec1bbc09f7?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
3a707829-1750-41c8-9819-b10c3e33c154	44c3e9da-6ee7-4fae-91e7-eca92062fba5	https://images.unsplash.com/photo-1519092437452-d94b9f4f18ab?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
cf81de7b-ee7a-43a0-becd-a3e2e0b71de6	77facf01-4839-4286-b13e-322a7ff2dd78	https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1280&h=720&fit=crop&q=85	f	1	2026-04-11 16:41:12.6387+00
6036e59a-282b-4ca2-b975-0936bf215685	77facf01-4839-4286-b13e-322a7ff2dd78	https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
c6542347-f9e0-4dfb-bd1d-ec9933523409	77facf01-4839-4286-b13e-322a7ff2dd78	https://images.unsplash.com/photo-1541560052-77ec1bbc09f7?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
34e1bb56-b1b8-47ff-b08a-ab671b548529	77facf01-4839-4286-b13e-322a7ff2dd78	https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
0f1d8747-e2ca-47c7-8612-a65e1efe9191	3eda0426-7947-4640-a1fb-7f380179433d	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	f	0	2026-04-11 16:19:34.178013+00
df678b19-7931-4821-90be-14d44217350b	3eda0426-7947-4640-a1fb-7f380179433d	https://images.unsplash.com/photo-1587474260584-136574e423ef?w=1280&h=720&fit=crop&q=85	f	2	2026-04-11 16:41:12.6387+00
fdf28221-283a-4c6e-b9ad-fb59684e9189	3eda0426-7947-4640-a1fb-7f380179433d	https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1280&h=720&fit=crop&q=85	f	3	2026-04-11 16:41:12.6387+00
85ad44c5-3ec6-4ba7-8d1e-49749e5444b0	3eda0426-7947-4640-a1fb-7f380179433d	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	f	4	2026-04-11 16:41:12.6387+00
2ba10cec-3c38-4513-ae6a-03090f598759	3eda0426-7947-4640-a1fb-7f380179433d	https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1280&h=720&fit=crop&q=85	t	1	2026-04-11 16:41:12.6387+00
\.


ALTER TABLE myagency.package_group_images ENABLE TRIGGER ALL;

--
-- Data for Name: package_group_products; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.package_group_products DISABLE TRIGGER ALL;

COPY myagency.package_group_products (id, package_group_id, product_id, quantity, unit_price, created_at) FROM stdin;
f453f641-fd8a-4cce-9465-a0fe819b77a0	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	3148fea2-9e3d-4d70-a4ed-1a60aff772c0	1	\N	2026-04-12 05:46:08.55906
63dcae04-8f92-4f66-b89a-f97c69fbe645	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	23492add-5fcc-480e-82e1-53d3455f6bbb	1	\N	2026-04-12 05:46:08.55906
4a20aa9f-cfb5-4aa4-8efb-ddac077e93f7	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	6fee53b9-167d-460f-b9bc-46a558d001be	1	\N	2026-04-12 05:46:08.55906
ffe89d3e-a746-425b-a1e8-e90138f42e6f	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	3499ef3b-628d-4151-a0a9-96a0aef1d5cd	1	\N	2026-04-12 05:46:08.55906
6e9654b5-f38a-42e8-b833-90db44f86399	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	3008d0d4-1483-463f-a165-0e706fbb3b2a	1	\N	2026-04-12 05:46:08.55906
12d99fb1-2c95-4423-b2e4-e42654a8b4b6	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	325dd950-c57c-46ad-b06c-bc6c0f39a094	1	\N	2026-04-12 05:46:08.55906
c62dd93a-6514-497b-be11-cafae3718edc	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	59fb8fd2-94f1-445c-b4a9-6614337379dd	1	\N	2026-04-12 05:46:08.55906
98174484-5bbd-4a4b-9e8f-143438254ac5	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	e6caba24-a50c-48ef-bcea-287881b92925	1	\N	2026-04-12 05:46:08.55906
7a65f2f3-0c1c-4387-ad5c-363fe8dad85b	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	5e539acf-50d6-4e7e-8fbd-3e3f68852de7	1	\N	2026-04-12 05:46:08.55906
4d23858e-224f-41f6-9bbc-a55ab34c4c11	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	c5d1ad26-0d7e-4151-b905-2b7be0a77775	1	\N	2026-04-12 05:46:08.55906
9fb2bb5d-7fcb-4beb-aa5c-e4becab42c0c	3eda0426-7947-4640-a1fb-7f380179433d	c5d1ad26-0d7e-4151-b905-2b7be0a77775	1	\N	2026-04-12 05:46:08.55906
1e25f6e1-fe05-47aa-a199-73106670ea30	3b3673f3-6fe8-4b28-9a8d-3f176df12409	c5d1ad26-0d7e-4151-b905-2b7be0a77775	1	\N	2026-04-12 05:46:08.55906
da02b45d-da2d-4ef1-af62-2a7062e273fa	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	e1036432-f933-4d71-b8a6-e69bfb4e2231	1	\N	2026-04-12 05:46:08.55906
6e9ee772-a108-4615-aeb0-d77eab2a4b5c	3eda0426-7947-4640-a1fb-7f380179433d	e1036432-f933-4d71-b8a6-e69bfb4e2231	1	\N	2026-04-12 05:46:08.55906
76b4ee60-26d6-47ee-8168-132ce13058cf	3b3673f3-6fe8-4b28-9a8d-3f176df12409	e1036432-f933-4d71-b8a6-e69bfb4e2231	1	\N	2026-04-12 05:46:08.55906
fa80631f-491a-4e68-8152-c5f5c7a0f87f	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	65cb5dd2-996c-49ec-a0dd-40e9250ad87e	1	\N	2026-04-12 05:46:08.55906
33aff79d-d50c-4695-84e7-44dd5305f39c	3eda0426-7947-4640-a1fb-7f380179433d	65cb5dd2-996c-49ec-a0dd-40e9250ad87e	1	\N	2026-04-12 05:46:08.55906
f615dc9e-5f21-4c3f-b1ab-ebd785ce0a25	3b3673f3-6fe8-4b28-9a8d-3f176df12409	65cb5dd2-996c-49ec-a0dd-40e9250ad87e	1	\N	2026-04-12 05:46:08.55906
3823f9f3-41eb-4004-8ad9-4d7408f6d657	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	c7ed2712-202f-4e21-a317-313072da1054	1	\N	2026-04-12 05:46:08.55906
693c8fc7-4a5c-4b89-9b32-a1e864d95b09	3eda0426-7947-4640-a1fb-7f380179433d	c7ed2712-202f-4e21-a317-313072da1054	1	\N	2026-04-12 05:46:08.55906
5e98a314-09b1-440f-87d3-460b06eb7b97	3b3673f3-6fe8-4b28-9a8d-3f176df12409	c7ed2712-202f-4e21-a317-313072da1054	1	\N	2026-04-12 05:46:08.55906
ff3d8950-6031-4349-b118-e0376ec70127	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	45141974-b219-4a9a-8dbf-33dec81b7c8a	1	\N	2026-04-12 05:46:08.55906
1b25c4fa-afe2-4c71-9aa4-dbcb6ede69c7	3eda0426-7947-4640-a1fb-7f380179433d	45141974-b219-4a9a-8dbf-33dec81b7c8a	1	\N	2026-04-12 05:46:08.55906
d694f045-2565-4730-88e5-b105af318cbe	3b3673f3-6fe8-4b28-9a8d-3f176df12409	45141974-b219-4a9a-8dbf-33dec81b7c8a	1	\N	2026-04-12 05:46:08.55906
e3170f6e-3718-41a7-a540-bf291a16c84e	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	a7df7108-3eea-4e8b-8a18-e11bffe37df8	1	\N	2026-04-12 05:46:08.55906
f54ad46b-2eef-4a28-8ea9-77b22b94f9c1	3eda0426-7947-4640-a1fb-7f380179433d	a7df7108-3eea-4e8b-8a18-e11bffe37df8	1	\N	2026-04-12 05:46:08.55906
ef493f52-0587-4b89-b777-2c5259d5a7d6	3b3673f3-6fe8-4b28-9a8d-3f176df12409	a7df7108-3eea-4e8b-8a18-e11bffe37df8	1	\N	2026-04-12 05:46:08.55906
1c0f08e3-159a-4494-b672-3e5a19879047	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	e269e241-4249-4e9b-9d57-f8ef9802d5e8	1	\N	2026-04-12 05:46:08.55906
c21a9087-2e5e-4aee-a508-2ae62147842a	3eda0426-7947-4640-a1fb-7f380179433d	e269e241-4249-4e9b-9d57-f8ef9802d5e8	1	\N	2026-04-12 05:46:08.55906
eac700d4-ea75-46fa-a72c-b6e0942b0fca	3b3673f3-6fe8-4b28-9a8d-3f176df12409	e269e241-4249-4e9b-9d57-f8ef9802d5e8	1	\N	2026-04-12 05:46:08.55906
4fdfc0c3-6afa-435d-80c6-2cd2c2a27e8a	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	294c1196-ece4-4776-95c7-e30dae83d37f	1	\N	2026-04-12 05:46:08.55906
d16a58e7-5988-4999-be27-944da1dc610a	3eda0426-7947-4640-a1fb-7f380179433d	294c1196-ece4-4776-95c7-e30dae83d37f	1	\N	2026-04-12 05:46:08.55906
d5232d25-8b68-4ae2-85a4-344aed6a9a52	3b3673f3-6fe8-4b28-9a8d-3f176df12409	294c1196-ece4-4776-95c7-e30dae83d37f	1	\N	2026-04-12 05:46:08.55906
2acce076-711c-4e12-a771-6bb2faccbc78	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	2e7e1c2e-f96d-4299-8073-0b1110bc2eaa	1	\N	2026-04-12 05:46:08.55906
95af4474-abb1-4a81-9be0-5979ed8ae5ba	3eda0426-7947-4640-a1fb-7f380179433d	2e7e1c2e-f96d-4299-8073-0b1110bc2eaa	1	\N	2026-04-12 05:46:08.55906
d2288056-b562-4571-8777-38735aad4ec2	3b3673f3-6fe8-4b28-9a8d-3f176df12409	2e7e1c2e-f96d-4299-8073-0b1110bc2eaa	1	\N	2026-04-12 05:46:08.55906
\.


ALTER TABLE myagency.package_group_products ENABLE TRIGGER ALL;

--
-- Data for Name: package_groups; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.package_groups DISABLE TRIGGER ALL;

COPY myagency.package_groups (id, camp_provider_id, name_en, name_ko, name_ja, name_th, description_en, description_ko, description_ja, description_th, thumbnail_url, location, country_code, status, sort_order, created_at, updated_at, landing_order, start_date, end_date, inclusions_en, inclusions_ko, exclusions_en, exclusions_ko, duration_text, min_age, max_age, type_id, year, month, institute_name, accommodation, tour_company, pickup_driver, required_documents, package_ppt_url, google_drive_url, package_code, local_manual, departure_ot, institute_id, accommodation_id, tour_company_id, pickup_driver_id, enrollment_spots, coordinator_id) FROM stdin;
686ac69b-d22c-4ac9-9e43-259e401fbdea	\N	2025 Jan-Melbourne_Acknowledge Family Camp	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1468254095679-bbcba94a7066?w=1280&h=720&fit=crop&q=85	Melbourne	AU	expired	1	2026-04-11 06:51:11.750799	2026-04-11 15:50:20.458936	\N	2025-01-19 00:00:00	2025-02-09 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	d35b1683-5689-4571-94cc-edc5b42695e4	2025	January	Acknowledge Education	Brady Hotel Flinders	Thanks Tour	Boong Boong Pickup	\N	\N	\N	MEL25JanFC	\N	\N	\N	\N	\N	\N	\N	\N
12e08ebd-4001-4f29-9978-a9e94291e207	\N	2025 Jul-Melbourne_Acknowledge Family Camp	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1468254095679-bbcba94a7066?w=1280&h=720&fit=crop&q=85	Melbourne	AU	expired	2	2026-04-11 06:51:15.647546	2026-04-11 15:50:20.458936	\N	2025-07-27 00:00:00	2025-08-17 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	d35b1683-5689-4571-94cc-edc5b42695e4	2025	July	Acknowledge Education	Brady Hotel Flinders	Thanks Tour	Boong Boong Pickup	\N	\N	\N	MEL25JulFC	\N	\N	\N	\N	\N	\N	\N	\N
4946a81c-7300-4120-952a-fcdbec919786	\N	2026 Feb-Melbourne_Collingwood Schooling	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	Melbourne	AU	expired	4	2026-04-11 06:51:23.522216	2026-04-11 15:50:20.855907	\N	2026-02-01 00:00:00	2026-02-22 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	0d4032d6-955c-4190-b4df-8bf54d211ce3	2026	February	Collingwood College	Brady Hotel Hardware	Thanks Tour	Boong Boong Pickup	\N	https://www.canva.com/design/DAGm9mO12pQ/pRu1f-87ixj94jQMVJJ_Nw/view?utm_content=DAGm9mO12pQ&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h3f9ac6a1e6	https://drive.google.com/drive/folders/1Nj7gAtwLWzGIySO7O1Ghc0RI9HLDElPp	MEL26FebSC	\N	\N	\N	\N	\N	\N	\N	\N
ffa24269-2627-494c-9967-b7b9b51f55c8	\N	2026 Feb-Melbourne_Oakleigh Schooling	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	Melbourne	AU	expired	5	2026-04-11 06:51:27.215454	2026-04-11 15:50:20.855907	\N	2026-02-08 00:00:00	2026-03-01 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	0d4032d6-955c-4190-b4df-8bf54d211ce3	2026	February	Oakleigh Grammar	Punthill Oakleigh	Thanks Tour	Boong Boong Pickup	\N	https://www.canva.com/design/DAGo_lmgMO8/p0Yon2avMKBWCzdl5DMWGQ/view?utm_content=DAGo_lmgMO8&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h7e43d281b6	https://drive.google.com/drive/folders/1ReMAa4WfCIKkhszF_0WR-0QytkKm7cPs	MEL26FebSO	\N	\N	\N	\N	\N	\N	\N	\N
6c413a67-f120-4421-af6f-e0f674a4a46b	\N	2026 Feb-Melbourne_Acknowledge English Camp	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1280&h=720&fit=crop&q=85	Melbourne	AU	expired	6	2026-04-11 06:51:30.976701	2026-04-11 15:50:21.00694	\N	2026-02-01 00:00:00	2026-02-22 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	78b06963-4e64-47bc-8ad7-af5384cd9f9d	2026	February	Acknowledge Education	Brady Hotel Flinders	Thanks Tour	Boong Boong Pickup	\N	https://www.canva.com/design/DAGpULEhXWo/47xByMOAy3mnBVglWPiemQ/view?utm_content=DAGpULEhXWo&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h8f2b7684dc	https://drive.google.com/drive/folders/14VM4qbro1leKljziAoqoGdnJv__jv_4g	MEL26FebFC	\N	\N	\N	\N	\N	\N	\N	\N
98d48032-f45c-4ae2-8942-3f8d0c1a047d	\N	2025 Jul-Phuket_Lighthouse Family Camp	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1280&h=720&fit=crop&q=85	Phuket	TH	expired	3	2026-04-11 06:51:19.644699	2026-04-11 15:50:21.013174	\N	2025-07-19 00:00:00	2025-08-09 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	d35b1683-5689-4571-94cc-edc5b42695e4	2025	July	Lighthouse International School	Noon Condo	\N	\N	\N	\N	\N	PHK25JulFC	\N	\N	\N	\N	\N	\N	\N	\N
9a925fe7-2001-43c4-8890-446ce478db06	\N	2026 Feb-Townsville_The Cathedral School	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&h=720&fit=crop&q=85	Townsville	AU	expired	7	2026-04-11 06:51:34.676893	2026-04-11 15:50:21.010127	\N	2026-02-01 00:00:00	2026-02-22 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	0d4032d6-955c-4190-b4df-8bf54d211ce3	2026	February	The Cathedral School	Jacana Apartments	\N	\N	\N	https://www.canva.com/design/DAGw3_9g0qY/h91kOSdiMeFzIzTFxmN-gg/edit	https://drive.google.com/drive/folders/1_A_nTjBlKNCzBn7PGwZ3NSKAe1Pcokxh	MEL26FebSO	\N	\N	\N	\N	\N	\N	\N	\N
490c3529-6984-45b1-a5ee-8cd6c9adfe67	\N	2026 Feb-Melbourne_Lloyd Street Schooling	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	Melbourne	AU	expired	10	2026-04-11 06:51:45.821732	2026-04-11 15:50:20.855907	\N	2026-02-01 00:00:00	2026-02-22 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	0d4032d6-955c-4190-b4df-8bf54d211ce3	2026	February	Lloyd Street Primary	Sebel Melbourne Malvern	Thanks Tour	Boong Boong Pickup	\N	https://www.canva.com/design/DAGxjJcK2VE/SAxyYVLu8ONDim0MgSCpIw/edit	https://drive.google.com/drive/folders/1D-JYuchNBe4PP8Qx9i5BQi-L1Fj_oY6L	MEL26FebLP	\N	\N	\N	\N	\N	\N	\N	\N
9f76ad68-b525-4f3f-a058-75dd69f32fec	\N	2026 Jan-Phuket_Lighthouse Schooling	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1535572290543-960a8046f5af?w=1280&h=720&fit=crop&q=85	Phuket	TH	expired	8	2026-04-11 06:51:38.384972	2026-04-11 15:50:21.016504	\N	2026-01-03 00:00:00	2026-02-02 00:00:00	\N	\N	\N	\N	4 Weeks	\N	\N	0d4032d6-955c-4190-b4df-8bf54d211ce3	2026	January	Lighthouse International School	Noon Condo	\N	\N	\N	https://www.canva.com/design/DAGumuQY80I/CS6J2TAkmHklyRxxGzpXow/view?utm_content=DAGumuQY80I&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hb23d9c1d62	\N	PHK26JanSS	\N	\N	\N	\N	\N	\N	\N	\N
19192829-d8c6-4a7d-9d36-a1ab1654edd8	\N	2026 Jan-Bangkok_AISB Schooling	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1280&h=720&fit=crop&q=85	Bangkok	TH	expired	9	2026-04-11 06:51:42.099018	2026-04-11 15:50:21.0196	\N	2026-01-10 00:00:00	2026-02-08 00:00:00	\N	\N	\N	\N	4 Weeks	\N	\N	0d4032d6-955c-4190-b4df-8bf54d211ce3	2026	January	Australian International School Bangkok (AISB)	Jasmine 59 Hotel	\N	\N	\N	https://www.canva.com/design/DAGuhKOGllw/xbNMWaJ73m6y5q3GTW0UXA/view?utm_content=DAGuhKOGllw&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h4da077681a	\N	BKK26JanSS	\N	\N	\N	\N	\N	\N	\N	\N
4db03171-d1be-4065-a110-21cc388e233a	\N	2027 Jan-Bangkok_AISB Schooling	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1280&h=720&fit=crop&q=85	Bangkok	TH	active	21	2026-04-11 06:52:27.28795	2026-04-11 15:50:21.0196	\N	2027-01-10 00:00:00	2027-02-08 00:00:00	\N	\N	\N	\N	4 Weeks	\N	\N	0d4032d6-955c-4190-b4df-8bf54d211ce3	2027	January	Australian International School Bangkok (AISB)	Jasmine 59 Hotel	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
77facf01-4839-4286-b13e-322a7ff2dd78	\N	2026 Jun-Bangkok_AISB Family Summer Camp	\N	\N	\N	Include: Airport Pickup, Accommodation, School /\nNot include: Airfare, Insurance, Living cost, Day tour	\N	\N	\N	https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&h=720&fit=crop&q=85	Bangkok	TH	pending	16	2026-04-11 06:52:08.34636	2026-04-11 15:50:21.02177	\N	2026-01-10 00:00:00	2026-02-08 00:00:00	\N	\N	\N	\N	4 Weeks	\N	\N	d56c1153-35e2-4a10-b1b1-0ee607d51ee4	2026	June	Australian International School Bangkok (AISB)	Jasmine 59 Hotel	\N	\N	\N	\N	\N	BKK26JanSS	\N	\N	\N	\N	\N	\N	\N	\N
db62d171-7d0b-43b4-8bef-b68a5e6edc8c	\N	2026 Jul-Phuket_Lighthouse Family Summer Camp	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfare, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1280&h=720&fit=crop&q=85	Phuket	TH	active	18	2026-04-11 06:52:15.970032	2026-04-17 02:27:28.405	2	2025-07-19 00:00:00	2025-08-09 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	d56c1153-35e2-4a10-b1b1-0ee607d51ee4	2026	July	Lighthouse International School	HOMA Chalong	\N	\N	\N	\N	\N	PHK25JulFC	\N	\N	\N	\N	\N	\N	\N	6176f3a0-f130-4a0d-9eca-f4af062eaaee
f8ca6e7b-5ab7-48df-8b22-fa3473640170	\N	2027 Feb-Melbourne_Collingwood Schooling	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	Melbourne	AU	inactive	19	2026-04-11 06:52:19.729228	2026-04-11 15:50:20.855907	\N	2027-01-30 00:00:00	2027-02-20 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	0d4032d6-955c-4190-b4df-8bf54d211ce3	2027	February	Collingwood College	Brady Hotel Hardware	Thanks Tour	Boong Boong Pickup	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
835b2dc0-3ad9-40f3-a0e1-639cb2be35d0	\N	2027 Feb-Melbourne_Oakleigh Schooling	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	Melbourne	AU	inactive	20	2026-04-11 06:52:23.444677	2026-04-11 15:50:20.855907	\N	2027-02-06 00:00:00	2027-02-27 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	0d4032d6-955c-4190-b4df-8bf54d211ce3	2027	February	Oakleigh Grammar	Punthill Oakleigh	Thanks Tour	Boong Boong Pickup	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
3eda0426-7947-4640-a1fb-7f380179433d	\N	2026 Jul-Melbourne_Oakleigh Schooling	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfair, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1280&h=720&fit=crop&q=85	Melbourne	AU	active	11	2026-04-11 06:51:49.683755	2026-04-17 02:08:46.864	6	2026-07-18 00:00:00	2026-08-08 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	0d4032d6-955c-4190-b4df-8bf54d211ce3	2026	July	Oakleigh Grammar	Punthill Oakleigh	Thanks Tour	Boong Boong Pickup	\N	https://www.canva.com/design/DAG6nhmUBJI/RNKa-p1NNB2hLSlAVx-uLA/view?utm_content=DAG6nhmUBJI&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h3bde091af4#1	https://drive.google.com/drive/u/0/folders/1NHLfGRAYsF9zCIJSZLIakPU_NsKW9p0X	\N	\N	\N	\N	\N	\N	\N	\N	a9c43d0b-865a-4ccd-aafa-ae74d7b405a0
f3da2590-9971-4c62-aa79-5906024e16d2	\N	2026 Jul-Townsville_The Cathedral School	\N	\N	\N	Include: Airport Pickup, Accommodation, School /\nNot include: Airfare, Insurance, Living cost, Day tour	\N	\N	\N	https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&h=720&fit=crop&q=85	Townsville	AU	active	14	2026-04-11 06:52:00.930196	2026-04-17 02:26:23.864	5	2026-07-18 00:00:00	2026-08-08 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	0d4032d6-955c-4190-b4df-8bf54d211ce3	2026	July	The Cathedral School	Jacana Apartments	\N	Townsville_Jaehoon JUNG	\N	https://www.canva.com/design/DAHBZPfoxz8/FwRR1tRTP0ADoxs4MsNNaA/view?utm_content=DAHBZPfoxz8&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hed8e3237e5	\N	MEL26FebSO	\N	\N	\N	\N	\N	\N	\N	a9c43d0b-865a-4ccd-aafa-ae74d7b405a0
3b3673f3-6fe8-4b28-9a8d-3f176df12409	\N	2026 Aug-Melbourne_Oakleigh Schooling	\N	\N	\N	Include: Airport Pickup, Accommodation, School /\nNot include: Airfair, Insurance, Living cost, Day tour	\N	\N	\N	https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1280&h=720&fit=crop&q=85	Melbourne	AU	active	12	2026-04-11 06:51:53.38034	2026-04-17 02:26:42.872	\N	2026-08-08 00:00:00	2026-08-22 00:00:00	\N	\N	\N	\N	2 Weeks	\N	\N	0d4032d6-955c-4190-b4df-8bf54d211ce3	2026	August	Oakleigh Grammar	Punthill Oakleigh	\N	Boong Boong Pickup	\N	https://www.canva.com/design/DAG6nhmUBJI/RNKa-p1NNB2hLSlAVx-uLA/view?utm_content=DAG6nhmUBJI&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h3bde091af4#1	https://drive.google.com/drive/u/0/folders/1NHLfGRAYsF9zCIJSZLIakPU_NsKW9p0X	\N	\N	\N	\N	\N	\N	\N	\N	a9c43d0b-865a-4ccd-aafa-ae74d7b405a0
96c936cc-d3a1-4fb2-8d09-843c9350e64f	\N	2026 Jul-Melbourne_Browns English Camp	\N	\N	\N	Include: Airport Pickup, Accommodation, School, Day tour /\nNot include: Airfare, Insurance, Living cost	\N	\N	\N	https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1280&h=720&fit=crop&q=85	Melbourne	AU	active	15	2026-04-11 06:52:04.723583	2026-04-17 02:26:53.606	1	2026-07-25 00:00:00	2026-08-15 00:00:00	\N	\N	\N	\N	3 Weeks	\N	\N	78b06963-4e64-47bc-8ad7-af5384cd9f9d	2026	July	BROWNS English Language School	Brady Hotel Flinders	Thanks Tour	Boong Boong Pickup	\N	https://www.canva.com/design/DAHAbP5p-qc/cKSr65La9aZGvqNR_2aIcg/view?utm_content=DAHAbP5p-qc&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h6ddb383981	\N	MEL26FebFC	\N	\N	\N	\N	\N	\N	\N	a9c43d0b-865a-4ccd-aafa-ae74d7b405a0
85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	\N	2026 Jul-Melbourne_Collingwood Schooling	\N	\N	\N	<p>Include: </p>	\N	\N	\N	https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1280&h=720&fit=crop&q=85	Melbourne	AU	active	13	2026-04-11 06:51:57.076519	2026-04-16 23:42:31.995	3	2026-07-18 00:00:00	2026-08-08 00:00:00	Airport Pickup\nAccommodation\nSchool\nDay tour	\N	Airfare\nInsurance\nLiving cost	\N	3 Weeks	\N	\N	0d4032d6-955c-4190-b4df-8bf54d211ce3	2026	July	Collingwood College	Brady Hotel Hardware	Thanks Tour	Boong Boong Pickup	\N	https://www.canva.com/design/DAG6-zizIr4/sj_hasInanejLEUEScZVSA/view?utm_content=DAG6-zizIr4&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h4e1756bbd2	https://drive.google.com/drive/u/0/folders/14NqLYT0q_VoBbdI4oU2MrJfDeDwg2HdX	MEL26JulCW	\N	\N	\N	\N	\N	\N	\N	a9c43d0b-865a-4ccd-aafa-ae74d7b405a0
44c3e9da-6ee7-4fae-91e7-eca92062fba5	\N	2026 Jul-Bangkok_Prep School-IVY Summer Camp	\N	\N	\N	Include: Airport Pickup, Accommodation, School /\nNot include: Airfare, Insurance, Living cost, Day tour	\N	\N	\N	https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1280&h=720&fit=crop&q=85	Bangkok	TH	active	17	2026-04-11 06:52:12.086406	2026-04-17 02:27:06.893	4	2026-01-10 00:00:00	2026-02-08 00:00:00	\N	\N	\N	\N	4 Weeks	\N	\N	d56c1153-35e2-4a10-b1b1-0ee607d51ee4	2026	July	Australian International School Bangkok (AISB)	Jasmine 59 Hotel	\N	\N	\N	\N	\N	BKK26JanSS	\N	\N	\N	\N	\N	\N	\N	6176f3a0-f130-4a0d-9eca-f4af062eaaee
\.


ALTER TABLE myagency.package_groups ENABLE TRIGGER ALL;

--
-- Data for Name: package_products; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.package_products DISABLE TRIGGER ALL;

COPY myagency.package_products (id, package_id, product_id, is_optional, quantity, unit_price, created_at) FROM stdin;
\.


ALTER TABLE myagency.package_products ENABLE TRIGGER ALL;

--
-- Data for Name: packages; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.packages DISABLE TRIGGER ALL;

COPY myagency.packages (id, package_group_id, name, duration_days, max_participants, price_aud, price_usd, price_krw, price_jpy, price_thb, price_php, price_sgd, price_gbp, features, status, created_at, updated_at, max_adults, max_students, agent_commission_type, agent_commission_rate, agent_commission_fixed, package_option, package_code, net_price, agent_comm_krw, revenue, camp_mgt, kakao_name, room_type, price_per_night, check_in_date, check_out_date, school_start_date, school_duration, pickup_date, pickup_fee, drop_date, drop_fee) FROM stdin;
8f3d60ec-1898-4ffb-abb8-ff135b9195bd	686ac69b-d22c-4ac9-9e43-259e401fbdea	A Package 1 Adult / 1 Child	21	\N	9500.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:09:59.098339	2026-04-11 07:09:59.098339	\N	\N	fixed	\N	1290.00	A Package 1 Adult / 1 Child	MEL25JanPA	8210.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
fa8440c9-c473-4caa-a935-eae36595734e	686ac69b-d22c-4ac9-9e43-259e401fbdea	B Package 1 Adult / 2 Child	21	\N	12100.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:10:02.868875	2026-04-11 07:10:02.868875	\N	\N	fixed	\N	1320.00	B Package 1 Adult / 2 Child	MEL25JanPB	10780.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
8d599ddf-18d0-4a43-b117-667e5b099ebc	686ac69b-d22c-4ac9-9e43-259e401fbdea	C Package 2 Adult / 1 Child	21	\N	17000.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:10:06.570825	2026-04-11 07:10:06.570825	\N	\N	fixed	\N	1550.00	C Package 2 Adult / 1 Child	MEL25JanPC	15450.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
2b11fce8-8ebd-4043-a19b-f55eb700aa40	686ac69b-d22c-4ac9-9e43-259e401fbdea	D Package 2 Adult / 2 Child	21	\N	10400.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:10:10.313432	2026-04-11 07:10:10.313432	\N	\N	fixed	\N	1290.00	D Package 2 Adult / 2 Child	MEL25JanPD	9110.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
aaf088ad-d8cb-4548-86b5-bf1b841d9282	12e08ebd-4001-4f29-9978-a9e94291e207	A Package 1 Adult / 1 Child	21	\N	9500.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:10:14.053803	2026-04-11 07:10:14.053803	\N	\N	fixed	\N	1290.00	A Package 1 Adult / 1 Child	MEL25JulPA	8210.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
909f29d6-6d0e-4006-9573-48338cfa4baf	12e08ebd-4001-4f29-9978-a9e94291e207	B Package 1 Adult / 2 Child	21	\N	13600.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:10:17.845829	2026-04-11 07:10:17.845829	\N	\N	fixed	\N	1320.00	B Package 1 Adult / 2 Child	MEL25JulPB	12280.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
1dade5cb-a38d-491c-9650-562f8978406e	12e08ebd-4001-4f29-9978-a9e94291e207	C Package 2 Adult / 1 Child	21	\N	17000.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:10:21.675267	2026-04-11 07:10:21.675267	\N	\N	fixed	\N	1550.00	C Package 2 Adult / 1 Child	MEL25JulPC	15450.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
24b96a46-e5d4-47e4-9254-670ffab62a77	12e08ebd-4001-4f29-9978-a9e94291e207	D Package 2 Adult / 2 Child	21	\N	12000.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:10:25.543423	2026-04-11 07:10:25.543423	\N	\N	fixed	\N	1290.00	D Package 2 Adult / 2 Child	MEL25JulPD	10710.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
861f4567-4fd9-40ae-b17f-dcd51713ff78	98d48032-f45c-4ae2-8942-3f8d0c1a047d	A Package 1 Adult / 1 Child	21	\N	\N	\N	\N	\N	124000.00	\N	\N	\N	\N	expired	2026-04-11 07:10:29.228097	2026-04-11 07:10:29.228097	\N	\N	fixed	\N	16920.00	A Package 1 Adult / 1 Child	PHK25JulPA	107080.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
d37c6e3a-41d2-4c5a-85c3-a921ec98f6a9	98d48032-f45c-4ae2-8942-3f8d0c1a047d	B Package 1 Adult / 2 Child	21	\N	\N	\N	\N	\N	179000.00	\N	\N	\N	\N	expired	2026-04-11 07:10:33.042304	2026-04-11 07:10:33.042304	\N	\N	fixed	\N	23800.00	B Package 1 Adult / 2 Child	PHK25JulPB	155200.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
8d2f121a-29fd-4093-ab1a-17a9b93fa1b8	98d48032-f45c-4ae2-8942-3f8d0c1a047d	C Package 2 Adult / 2 Child	21	\N	\N	\N	\N	\N	213000.00	\N	\N	\N	\N	expired	2026-04-11 07:10:36.737312	2026-04-11 07:10:36.737312	\N	\N	fixed	\N	30600.00	C Package 2 Adult / 2 Child	PHK25JulPC	182400.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
0b6e2d9c-fdf3-4446-a4e4-a9253b3bf0c8	98d48032-f45c-4ae2-8942-3f8d0c1a047d	A Package 1 Adult / 1 Child	21	\N	\N	\N	\N	\N	190000.00	\N	\N	\N	\N	expired	2026-04-11 07:10:40.492253	2026-04-11 07:10:40.492253	\N	\N	fixed	\N	27500.00	A Package 1 Adult / 1 Child	PHK25JulPE	162500.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
0f0d09bc-9df1-4da7-8aae-bd9c65801e22	98d48032-f45c-4ae2-8942-3f8d0c1a047d	B Package 1 Adult / 2 Child	21	\N	\N	\N	\N	\N	270000.00	\N	\N	\N	\N	expired	2026-04-11 07:10:44.277478	2026-04-11 07:10:44.277478	\N	\N	fixed	\N	41000.00	B Package 1 Adult / 2 Child	PHK25JulPF	229000.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
2af65f0a-4912-4088-86dc-5fee06c1ebe6	98d48032-f45c-4ae2-8942-3f8d0c1a047d	C Package 2 Adult / 2 Child	21	\N	\N	\N	\N	\N	304000.00	\N	\N	\N	\N	expired	2026-04-11 07:10:48.029233	2026-04-11 07:10:48.029233	\N	\N	fixed	\N	41000.00	C Package 2 Adult / 2 Child	PHK25JulPG	263000.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
0c213939-3d11-46ea-b7b9-48d8b32062f7	4946a81c-7300-4120-952a-fcdbec919786	A Package 1 Adult / 1 Child	21	\N	9400.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:10:51.906012	2026-04-11 07:10:51.906012	\N	\N	fixed	\N	1400.00	A Package 1 Adult / 1 Child	MEL26FebSA	8210.00	\N	4056.00	\N	\N	1 Bedroom	145.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	240.00	2026-02-22	240.00
24a600cd-6f2c-4b02-bf14-07b8a6d68d34	4946a81c-7300-4120-952a-fcdbec919786	B Package 1 Adult / 2 Child	21	\N	13500.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:10:55.555505	2026-04-11 07:10:55.555505	\N	\N	fixed	\N	1300.00	B Package 1 Adult / 2 Child	MEL26FebSB	12280.00	\N	4496.00	\N	\N	2 Bedrooms	240.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	250.00	2026-02-22	250.00
c1e3a942-d015-46c7-bb04-9d2ded1e4e27	4946a81c-7300-4120-952a-fcdbec919786	C Package 2 Adult / 1 Child	21	\N	11800.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:10:59.252722	2026-04-11 07:10:59.252722	\N	\N	fixed	\N	1210.00	C Package 2 Adult / 1 Child	MEL26FebSD	10710.00	\N	4097.00	\N	\N	2 Bedrooms	240.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	250.00	2026-02-22	250.00
278a76fa-2832-4217-b2cf-21f3a288956f	4946a81c-7300-4120-952a-fcdbec919786	D Package 2 Adult / 2 Child	21	\N	14300.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:03.05551	2026-04-11 07:11:03.05551	\N	\N	fixed	\N	1540.00	D Package 2 Adult / 2 Child	MEL26FebSC	15450.00	\N	4819.00	\N	\N	2 Bedrooms	240.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	260.00	2026-02-22	260.00
eb354c75-bd2b-4f2a-a78c-6530618df729	ffa24269-2627-494c-9967-b7b9b51f55c8	A Package 1 Adult / 1 Child	21	\N	9900.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:06.891204	2026-04-11 07:11:06.891204	\N	\N	fixed	\N	1400.00	A Package 1 Adult / 1 Child	MEL26FebOA	8500.00	\N	3531.00	\N	\N	1 Bedroom	125.00	2026-02-08	2026-03-01	2026-02-09	3 Weeks	2026-02-08	140.00	2026-03-01	80.00
1ea7dad1-c99d-40bd-bf3b-3877a542e96e	ffa24269-2627-494c-9967-b7b9b51f55c8	B Package 1 Adult / 2 Child	21	\N	14200.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:10.700829	2026-04-11 07:11:10.700829	\N	\N	fixed	\N	1300.00	B Package 1 Adult / 2 Child	MEL26FebOB	12900.00	\N	3799.00	\N	\N	1 Bedroom + 1 Extra Bed	175.00	2026-02-08	2026-03-01	2026-02-09	3 Weeks	2026-02-08	150.00	2026-03-01	90.00
d70517e1-1846-4283-8090-177463081e0d	ffa24269-2627-494c-9967-b7b9b51f55c8	C Package 2 Adult / 1 Child	21	\N	11600.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:14.537598	2026-04-11 07:11:14.537598	\N	\N	fixed	\N	1595.00	C Package 2 Adult / 1 Child	MEL26FebOC	9690.00	\N	3797.00	\N	\N	1 Bedroom + 1 Extra Bed	175.00	2026-02-08	2026-03-01	2026-02-09	3 Weeks	2026-02-08	150.00	2026-03-01	90.00
49a91277-83db-421a-9e36-b65d40f1af85	ffa24269-2627-494c-9967-b7b9b51f55c8	D Package 2 Adult / 2 Child	21	\N	16200.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:18.261902	2026-04-11 07:11:18.261902	\N	\N	fixed	\N	1540.00	D Package 2 Adult / 2 Child	MEL26FebOD	14660.00	\N	4177.00	\N	\N	1 Bedroom + 1 Studio	230.00	2026-02-08	2026-03-01	2026-02-09	3 Weeks	2026-02-08	160.00	2026-03-01	100.00
70d0075b-1a4f-4e92-99e3-3ddf2c680924	9a925fe7-2001-43c4-8890-446ce478db06	A Package 1 Adult / 1 Child	21	\N	11700.00	\N	10530000	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:22.044101	2026-04-11 07:11:22.044101	\N	\N	fixed	\N	1400.00	A Package 1 Adult / 1 Child	MEL26FebSA	10300.00	1260000	3227.00	\N	\N	1 Bedroom	180.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	240.00	2026-02-22	240.00
36ea6f2c-a88a-4d4e-810d-abc5d2f26518	9a925fe7-2001-43c4-8890-446ce478db06	B Package 1 Adult / 2 Children	21	\N	17300.00	\N	15570000	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:25.9412	2026-04-11 07:11:25.9412	\N	\N	fixed	\N	1500.00	B Package 1 Adult / 2 Children	MEL26FebSA	15800.00	1350000	3855.00	\N	\N	2 Bedrooms	230.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	\N	2026-02-22	\N
0a5eb400-8ab7-4449-93e5-f65f077d8950	9a925fe7-2001-43c4-8890-446ce478db06	C Package 2 Adult / 1 Child	21	\N	13200.00	\N	11880000	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:30.083784	2026-04-11 07:11:30.083784	\N	\N	fixed	\N	1400.00	C Package 2 Adult / 1 Child	MEL26FebSA	11800.00	1260000	3227.00	\N	\N	2 Bedrooms	230.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	\N	2026-02-22	\N
66ce6558-9d0e-403b-87f0-a66b13cfe55a	9a925fe7-2001-43c4-8890-446ce478db06	D Package 2 Adult / 2 Children	21	\N	17720.00	\N	15930000	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:33.909537	2026-04-11 07:11:33.909537	\N	\N	fixed	\N	1500.00	D Package 2 Adult / 2 Children	MEL26FebSA	16200.00	1350000	3855.00	\N	\N	2 Bedrooms	230.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	\N	2026-02-22	\N
a6a82062-93e9-42cd-858d-f063dff034cf	9a925fe7-2001-43c4-8890-446ce478db06	E Package 1 Child Only	21	\N	9400.00	\N	8460000	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:37.654618	2026-04-11 07:11:37.654618	\N	\N	fixed	\N	1050.00	E Package 1 Child Only	MEL26FebSA	8350.00	950000	1900.00	\N	\N	School Boarding	\N	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	\N	2026-02-22	\N
0a03cc7b-202a-471d-a4b6-e0fdbc56d937	6c413a67-f120-4421-af6f-e0f674a4a46b	A Package 1 Adult / 1 Child	21	\N	9400.00	\N	8460000	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:41.536225	2026-04-11 07:11:41.536225	\N	\N	fixed	\N	1290.00	A Package 1 Adult / 1 Child	MEL26FebFA	8110.00	\N	3414.00	\N	\N	1 Bedroom	155.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	240.00	2026-02-22	240.00
62684665-0bb5-482e-bfd9-c107801868d0	6c413a67-f120-4421-af6f-e0f674a4a46b	B Package 1 Adult / 2 Child	21	\N	13200.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:45.378772	2026-04-11 07:11:45.378772	\N	\N	fixed	\N	1470.00	B Package 1 Adult / 2 Child	MEL26FebFB	11730.00	\N	4335.00	\N	\N	1 Bedroom + 1 Sofa Bed	185.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	250.00	2026-02-22	250.00
973c6d88-34d1-4202-a2f4-190864c8a18f	6c413a67-f120-4421-af6f-e0f674a4a46b	C Package 2 Adult / 1 Child	21	\N	10700.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:49.228842	2026-04-11 07:11:49.228842	\N	\N	fixed	\N	1400.00	C Package 2 Adult / 1 Child	MEL26FebFC	9300.00	\N	3619.00	\N	\N	1 Bedroom + 1 Sofa Bed	185.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	250.00	2026-02-22	250.00
cbab83a4-b74b-41a1-88e9-2ee2560c679f	6c413a67-f120-4421-af6f-e0f674a4a46b	D Package 2 Adult / 2 Child	21	\N	17400.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:52.915763	2026-04-11 07:11:52.915763	\N	\N	fixed	\N	1550.00	D Package 2 Adult / 2 Child	MEL26FebFD	15850.00	\N	5589.00	\N	\N	1 Bedroom + 1 Studio	310.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	260.00	2026-02-22	260.00
63ad012e-deef-408d-9057-51bc56dba0a1	6c413a67-f120-4421-af6f-e0f674a4a46b	E Package Child Only	21	\N	6500.00	\N	\N	\N	\N	\N	\N	\N	\N	expired	2026-04-11 07:11:56.708304	2026-04-11 07:11:56.708304	\N	\N	fixed	\N	750.00	E Package Child Only	MEL26FebFE	5750.00	\N	2388.00	\N	\N	Homestay	1770.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	\N	2026-02-22	\N
124cf30c-4bae-4980-88e3-fdfb6e4de380	9f76ad68-b525-4f3f-a058-75dd69f32fec	A Package 1 Adult / 1 Child	28	\N	\N	\N	\N	\N	200000.00	\N	\N	\N	\N	expired	2026-04-11 07:12:00.54443	2026-04-11 07:12:00.54443	\N	\N	fixed	\N	27300.00	A Package 1 Adult / 1 Child	PHK26JanSA	173250.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
e2cf3f73-4174-4000-a5b1-cb7e7cee6521	9f76ad68-b525-4f3f-a058-75dd69f32fec	B Package 1 Adult / 2 Child	28	\N	\N	\N	\N	\N	290000.00	\N	\N	\N	\N	expired	2026-04-11 07:12:04.483972	2026-04-11 07:12:04.483972	\N	\N	fixed	\N	31500.00	B Package 1 Adult / 2 Child	PHK26JanSB	263000.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
fbf81688-3257-44c2-b3bd-982b56ea9153	9f76ad68-b525-4f3f-a058-75dd69f32fec	C Package 2 Adult / 1 Child	28	\N	\N	\N	\N	\N	226000.00	\N	\N	\N	\N	expired	2026-04-11 07:12:08.336886	2026-04-11 07:12:08.336886	\N	\N	fixed	\N	29400.00	C Package 2 Adult / 1 Child	PHK26JanSC	190000.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
969f096b-7155-4fd1-9d2f-d371fc847f2e	9f76ad68-b525-4f3f-a058-75dd69f32fec	D Package 2 Adult / 2 Child	28	\N	\N	\N	\N	\N	326000.00	\N	\N	\N	\N	expired	2026-04-11 07:12:12.031142	2026-04-11 07:12:12.031142	\N	\N	fixed	\N	33180.00	D Package 2 Adult / 2 Child	PHK26JanSD	282500.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
9128015b-1424-41ba-8e23-68b97136bc84	19192829-d8c6-4a7d-9d36-a1ab1654edd8	A Package 1 Adult / 1 Child	28	\N	\N	\N	10160000	\N	231000.00	\N	\N	\N	\N	expired	2026-04-11 07:12:15.827613	2026-04-11 07:12:15.827613	\N	\N	fixed	\N	25200.00	A Package 1 Adult / 1 Child	BKK26JanSA	205800.00	1110000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
1d0f9c42-a938-447c-9de3-603c6ca0bdad	19192829-d8c6-4a7d-9d36-a1ab1654edd8	B Package 1 Adult / 2 Child	28	\N	\N	\N	16240000	\N	369000.00	\N	\N	\N	\N	expired	2026-04-11 07:12:19.77183	2026-04-11 07:12:19.77183	\N	\N	fixed	\N	30360.00	B Package 1 Adult / 2 Child	BKK26JanSB	338640.00	1340000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
0e4fdb44-9d02-454b-b1d8-6735eceaada3	19192829-d8c6-4a7d-9d36-a1ab1654edd8	C Package 2 Adult / 1 Child	28	\N	\N	\N	11840000	\N	269000.00	\N	\N	\N	\N	expired	2026-04-11 07:12:23.465492	2026-04-11 07:12:23.465492	\N	\N	fixed	\N	29250.00	C Package 2 Adult / 1 Child	BKK26JanSC	239750.00	1290000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
bfff81a0-97dc-468f-87bb-e921d3c7e74f	19192829-d8c6-4a7d-9d36-a1ab1654edd8	D Package 2 Adult / 2 Child	28	\N	\N	\N	17560000	\N	399000.00	\N	\N	\N	\N	expired	2026-04-11 07:12:27.199487	2026-04-11 07:12:27.199487	\N	\N	fixed	\N	31960.00	D Package 2 Adult / 2 Child	BKK26JanSD	367040.00	1410000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
2f1f35b2-ab89-4052-ac66-63d1e8661c5d	3eda0426-7947-4640-a1fb-7f380179433d	A Package 1 Adult / 1 Child	21	\N	9900.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:12:31.021816	2026-04-17 02:08:47.095	\N	\N	fixed	\N	1400.00	A Package 1 Adult / 1 Child	26JuMlOakA	8500.00	\N	3477.00	2026.00	26Jul오클리A2	1 Bedroom	135.00	2026-07-18	2026-08-08	2026-07-20	3 Weeks	2026-07-18	\N	2026-08-08	\N
c8093fc3-9ffe-4238-a112-e86c7300f358	3eda0426-7947-4640-a1fb-7f380179433d	B Package 1 Adult / 2 Child	21	\N	14200.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:12:34.753714	2026-04-17 02:08:47.095	\N	\N	fixed	\N	1600.00	B Package 1 Adult / 2 Child	26JuMlOakB	12600.00	\N	4463.00	2026.00	26Jul오클리B3	1 Bedroom + 1 Extra Bed	155.00	2026-07-18	2026-08-08	2026-07-20	3 Weeks	2026-07-18	\N	2026-08-08	\N
86d4ac9d-95fd-41d0-992c-e21ad4e39e60	3eda0426-7947-4640-a1fb-7f380179433d	C Package 2 Adult / 1 Child	21	\N	11600.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:12:38.647768	2026-04-17 02:08:47.095	\N	\N	fixed	\N	1800.00	C Package 2 Adult / 1 Child	26JuMlOakC	9800.00	\N	4523.00	\N	26Jul오클리C3	1 Bedroom + 1 Extra Bed	155.00	2026-07-18	2026-08-08	2026-07-20	3 Weeks	2026-07-18	\N	2026-08-08	\N
8afab48a-cb69-47b0-b293-67c6f5a80cbd	3eda0426-7947-4640-a1fb-7f380179433d	D Package 2 Adult / 2 Child	21	\N	16600.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:12:42.43185	2026-04-17 02:08:47.095	\N	\N	fixed	\N	1600.00	D Package 2 Adult / 2 Child	26JuMlOakD	15000.00	\N	4582.00	\N	26Jul오클리D4	1 Bedroom + 1 Studio	250.00	2026-07-18	2026-08-08	2026-07-20	3 Weeks	2026-07-18	\N	2026-08-08	\N
914feb38-4fa6-4c3f-b9e7-e8e4be24edca	f3da2590-9971-4c62-aa79-5906024e16d2	A Package 1 Adult / 1 Child	21	\N	11700.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:24.37602	2026-04-17 02:26:23.898	\N	\N	fixed	\N	1400.00	A Package 1 Adult / 1 Child	26JuToCatA	10300.00	\N	3227.00	\N	26Jul타운스빌A2	1 Bedroom	180.00	2026-07-18	2026-08-08	2026-02-02	3 Weeks	2026-02-01	240.00	2026-02-22	240.00
c53ef657-548d-49ab-b5d0-93fb2aafcae0	f3da2590-9971-4c62-aa79-5906024e16d2	B Package 1 Adult / 2 Child	21	\N	14200.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:28.257685	2026-04-17 02:26:23.898	\N	\N	fixed	\N	1600.00	B Package 1 Adult / 2 Child	26JuToCatB	12600.00	\N	5525.00	\N	26Jul타운스빌B3	1 Bedroom + 1 Sofa Bed	165.00	2026-07-25	2026-08-15	2026-07-27	3 Weeks	2026-02-01	180.00	2026-02-22	120.00
568a699f-33b1-407c-9e61-ba9ababd4209	f3da2590-9971-4c62-aa79-5906024e16d2	C Package 2 Adult / 1 Child	21	\N	11100.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:32.354175	2026-04-17 02:26:23.898	\N	\N	fixed	\N	1300.00	C Package 2 Adult / 1 Child	26JuToCatC	9800.00	\N	4251.00	2026.00	26Jul타운스빌C3	1 Bedroom + 1 Sofa Bed	165.00	2026-07-25	2026-08-15	2026-07-27	3 Weeks	2026-02-01	180.00	2026-02-22	120.00
69ba41ad-99bb-4703-8422-42093d2feaec	f3da2590-9971-4c62-aa79-5906024e16d2	D Package 2 Adult / 2 Child	21	\N	17600.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:36.156521	2026-04-17 02:26:23.898	\N	\N	fixed	\N	1700.00	D Package 2 Adult / 2 Child	26JuToCatD	15900.00	\N	6245.00	\N	26Jul타운스빌D4	1 Bedroom + 1 Studio	270.00	2026-07-25	2026-08-15	2026-07-27	3 Weeks	2026-02-01	190.00	2026-02-22	130.00
314ea218-8aec-47aa-a983-93347dfde9a1	f3da2590-9971-4c62-aa79-5906024e16d2	E Package 1 Child Only	21	\N	9400.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:39.863485	2026-04-17 02:26:23.898	\N	\N	fixed	\N	1050.00	E Package 1 Child Only	26JuToCatE	8350.00	\N	1900.00	\N	26Jul타운스빌E1	School Boarding	\N	2026-07-25	2026-08-15	2026-07-27	3 Weeks	2026-02-01	\N	2026-02-22	\N
9ff49453-5697-4b9a-bc8a-06ef6d2eedbc	3b3673f3-6fe8-4b28-9a8d-3f176df12409	A Package 1 Adult / 1 Child	14	\N	6600.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:12:49.982607	2026-04-17 02:26:42.878	\N	\N	fixed	\N	1000.00	A Package 1 Adult / 1 Child	26AgMlOakA	5600.00	\N	2421.00	2026.00	26Aug오클리A2	1 Bedroom	145.00	2026-08-08	2026-08-22	2026-08-24	2 Weeks	2026-08-08	\N	2026-08-22	\N
08d3eeeb-246f-4449-89e8-82cee96ff296	3b3673f3-6fe8-4b28-9a8d-3f176df12409	B Package 1 Adult / 2 Child	14	\N	9200.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:12:53.815467	2026-04-17 02:26:42.878	\N	\N	fixed	\N	1200.00	B Package 1 Adult / 2 Child	26AgMlOakB	8000.00	\N	3019.00	\N	26Aug오클리B3	1 Bedroom + 1 Extra Bed	165.00	2026-08-08	2026-08-22	2026-08-24	2 Weeks	2026-08-08	\N	2026-08-22	\N
c84d5826-919b-443e-9fe4-15eb85b4ca98	3b3673f3-6fe8-4b28-9a8d-3f176df12409	C Package 2 Adult / 1 Child	14	\N	7300.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:12:57.514529	2026-04-17 02:26:42.878	\N	\N	fixed	\N	1200.00	C Package 2 Adult / 1 Child	26AgMlOakC	6100.00	\N	2844.00	2026.00	26Aug오클리C3	1 Bedroom + 1 Extra Bed	165.00	2026-08-08	2026-08-22	2026-08-24	2 Weeks	2026-08-08	\N	2026-08-22	\N
3af34501-8aeb-416c-bf2d-028f18d684fc	3b3673f3-6fe8-4b28-9a8d-3f176df12409	D Package 2 Adult / 2 Child	14	\N	10800.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:01.341697	2026-04-17 02:26:42.878	\N	\N	fixed	\N	1200.00	D Package 2 Adult / 2 Child	26AgMlOakD	9600.00	\N	3168.00	2026.00	26Aug오클리D4	1 Bedroom + 1 Studio	270.00	2026-08-08	2026-08-22	2026-08-24	2 Weeks	2026-08-08	\N	2026-08-22	\N
5c04cf50-6266-4f3b-bfa2-c5bea6cbc7bc	3b3673f3-6fe8-4b28-9a8d-3f176df12409	E Package 1 Child Only	14	\N	5700.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:05.204412	2026-04-17 02:26:42.878	\N	\N	fixed	\N	900.00	E Package 1 Child Only	26AgMlOakE	4800.00	\N	2154.00	\N	26Aug오클리E1	Homestay + Pick/Drop	460.00	2026-08-08	2026-08-22	2026-08-24	2 Weeks	2026-08-08	\N	2026-08-22	\N
817dd990-91ff-4843-b881-ed3679d8caec	96c936cc-d3a1-4fb2-8d09-843c9350e64f	A Package 1 Adult / 1 Child	21	\N	9700.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:43.869448	2026-04-17 02:26:53.612	\N	\N	fixed	\N	1200.00	A Package 1 Adult / 1 Child	26JuMeBrA	8500.00	\N	3946.00	2026.00	26Jul브라운스A1	1 Bedroom	135.00	2026-07-25	2026-08-15	2026-07-27	3 Weeks	2026-02-01	170.00	2026-02-22	110.00
5c1cb0e5-05f8-4e41-8f91-5c5af56c38dc	96c936cc-d3a1-4fb2-8d09-843c9350e64f	B Package 1 Adult / 2 Children	21	\N	14200.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:47.579715	2026-04-17 02:26:53.612	\N	\N	fixed	\N	1600.00	B Package 1 Adult / 2 Children	26JuMeBrB	12600.00	\N	5525.00	\N	26Jul브라운스B3	2 Bedrooms	230.00	2026-07-18	2026-08-08	2026-02-02	3 Weeks	2026-02-01	\N	2026-02-22	\N
95a4806b-5d97-4be0-9ef8-01872665525e	96c936cc-d3a1-4fb2-8d09-843c9350e64f	C Package 2 Adult / 1 Child	21	\N	11100.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:51.290226	2026-04-17 02:26:53.612	\N	\N	fixed	\N	1300.00	C Package 2 Adult / 1 Child	26JuMeBrC	9800.00	\N	4251.00	\N	26Jul브라운스C3	2 Bedrooms	230.00	2026-07-18	2026-08-08	2026-02-02	3 Weeks	2026-02-01	\N	2026-02-22	\N
8e8ce4bc-0585-48b1-9479-7d45f348665f	96c936cc-d3a1-4fb2-8d09-843c9350e64f	D Package 2 Adult / 2 Children	21	\N	17600.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:55.08615	2026-04-17 02:26:53.612	\N	\N	fixed	\N	1700.00	D Package 2 Adult / 2 Children	26JuMeBrD	15900.00	\N	6245.00	\N	26Jul브라운스D4	2 Bedrooms	230.00	2026-07-18	2026-08-08	2026-02-02	3 Weeks	2026-02-01	\N	2026-02-22	\N
31aecd5c-7467-4a87-bd50-197782958e55	44c3e9da-6ee7-4fae-91e7-eca92062fba5	A Package 1 Adult  & & 1 Child	28	\N	\N	\N	\N	\N	196000.00	\N	\N	\N	\N	active	2026-04-11 07:13:58.811277	2026-04-17 02:27:06.91	\N	\N	fixed	\N	25200.00	A Package 1 Adult  & & 1 Child	26JuBkIvA	170800.00	\N	56000.00	\N	26Jul방콕프렙A2	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
a24f712d-9a45-4b24-a737-978d1c860701	44c3e9da-6ee7-4fae-91e7-eca92062fba5	B Package 1 Adult  & & 2 Children	28	\N	\N	\N	\N	\N	311000.00	\N	\N	\N	\N	active	2026-04-11 07:14:02.640061	2026-04-17 02:27:06.91	\N	\N	fixed	\N	30600.00	B Package 1 Adult  & & 2 Children	26JuBkIvB	280400.00	\N	68000.00	\N	26Jul방콕프렙B3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
1f4e7e3b-72d1-4b67-b348-6449ca13bbf8	44c3e9da-6ee7-4fae-91e7-eca92062fba5	C Package 2 Adult  & & 1 Children	28	\N	\N	\N	\N	\N	226000.00	\N	\N	\N	\N	active	2026-04-11 07:14:06.546112	2026-04-17 02:27:06.91	\N	\N	fixed	\N	29040.00	C Package 2 Adult  & & 1 Children	26JuBkIvC	196960.00	\N	66000.00	\N	26Jul방콕프렙C3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
2548c210-24ec-4da6-8c22-5b2cd88df7f2	44c3e9da-6ee7-4fae-91e7-eca92062fba5	D Package 2 Adult  & & 2 Children	28	\N	\N	\N	\N	\N	327000.00	\N	\N	\N	\N	active	2026-04-11 07:14:10.429605	2026-04-17 02:27:06.91	\N	\N	fixed	\N	31200.00	D Package 2 Adult  & & 2 Children	26JuBkIvD	295800.00	\N	65000.00	\N	26Jul방콕프렙D4	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
2f23085c-36b6-4ed3-971a-d6ddb1195962	f8ca6e7b-5ab7-48df-8b22-fa3473640170	A Package 1 Adult / 1 Child	21	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:14:36.771076	2026-04-11 07:14:36.771076	\N	\N	\N	\N	\N	A Package 1 Adult / 1 Child	27FeMlColA	\N	\N	\N	\N	26Jul콜링우드A2	1 Bedroom	145.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	240.00	2026-02-22	240.00
543252f1-37fe-40f7-a80f-81ef495f8a84	f8ca6e7b-5ab7-48df-8b22-fa3473640170	B Package 1 Adult / 2 Child	21	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:14:40.705947	2026-04-11 07:14:40.705947	\N	\N	\N	\N	\N	B Package 1 Adult / 2 Child	27FeMlColB	\N	\N	\N	\N	26Jul콜링우드B3	2 Bedrooms	240.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	250.00	2026-02-22	250.00
f0ca2813-80a1-4b94-94d5-c9e3efecbb16	f8ca6e7b-5ab7-48df-8b22-fa3473640170	C Package 2 Adult / 1 Child	21	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:14:44.545898	2026-04-11 07:14:44.545898	\N	\N	\N	\N	\N	C Package 2 Adult / 1 Child	27FeMlColC	\N	\N	\N	\N	26Jul콜링우드C3	2 Bedrooms	240.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	250.00	2026-02-22	250.00
24e21241-50d4-423f-9a75-09e7267153c4	f8ca6e7b-5ab7-48df-8b22-fa3473640170	D Package 2 Adult / 2 Child	21	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:14:48.491287	2026-04-11 07:14:48.491287	\N	\N	\N	\N	\N	D Package 2 Adult / 2 Child	27FeMlColD	\N	\N	\N	\N	26Jul콜링우드D4	2 Bedrooms	240.00	2026-02-01	2026-02-22	2026-02-02	3 Weeks	2026-02-01	260.00	2026-02-22	260.00
9b6eaeac-83f3-47db-963c-7abd608a2f9c	835b2dc0-3ad9-40f3-a0e1-639cb2be35d0	A Package 1 Adult / 1 Child	21	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:14:52.355129	2026-04-11 07:14:52.355129	\N	\N	\N	\N	\N	A Package 1 Adult / 1 Child	27FeMlOakA	\N	\N	\N	\N	26Aug오클리A2	1 Bedroom	125.00	2026-02-08	2026-03-01	2026-02-09	3 Weeks	2026-02-08	140.00	2026-03-01	80.00
6c001771-6c51-4782-879c-95b207e43b2f	835b2dc0-3ad9-40f3-a0e1-639cb2be35d0	B Package 1 Adult / 2 Children	21	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:14:56.393059	2026-04-11 07:14:56.393059	\N	\N	\N	\N	\N	B Package 1 Adult / 2 Children	27FeMlOakB	\N	\N	\N	\N	26Aug오클리B3	1 Bedroom + 1 Extra Bed	175.00	2026-02-08	2026-03-01	2026-02-09	3 Weeks	2026-02-08	150.00	2026-03-01	90.00
dda4c1f6-b66c-4d2a-8645-89082f0cdcfd	835b2dc0-3ad9-40f3-a0e1-639cb2be35d0	C Package 2 Adult / 1 Child	21	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:15:00.241261	2026-04-11 07:15:00.241261	\N	\N	\N	\N	\N	C Package 2 Adult / 1 Child	27FeMlOakC	\N	\N	\N	\N	26Aug오클리C3	1 Bedroom + 1 Extra Bed	175.00	2026-02-08	2026-03-01	2026-02-09	3 Weeks	2026-02-08	150.00	2026-03-01	90.00
fdcdf3c3-7425-4a1e-818a-6cb83c3f65f4	835b2dc0-3ad9-40f3-a0e1-639cb2be35d0	D Package 2 Adult / 2 Children	21	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:15:04.291239	2026-04-11 07:15:04.291239	\N	\N	\N	\N	\N	D Package 2 Adult / 2 Children	27FeMlOakD	\N	\N	\N	\N	26Aug오클리D4	1 Bedroom + 1 Studio	230.00	2026-02-08	2026-03-01	2026-02-09	3 Weeks	2026-02-08	160.00	2026-03-01	100.00
9f59733a-d10b-453c-9291-e4a6a250236d	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	A Package 1 Adult / 1 Child	21	\N	9800.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:09.093035	2026-04-16 23:42:32.001	\N	\N	fixed	\N	1400.00	A Package 1 Adult / 1 Child	26JuMlColA	8400.00	\N	3439.00	2026.00	26Jul콜링우드A2	1 Bedroom	\N	2026-07-18	2026-08-08	2026-07-20	3 Weeks	2026-07-18	170.00	2026-08-08	110.00
2c672385-36c5-41f1-9b0d-a7fcf683c5dd	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	B Package 1 Adult / 2 Child	21	\N	15000.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:12.891241	2026-04-16 23:42:32.001	\N	\N	fixed	\N	1500.00	B Package 1 Adult / 2 Child	26JuMlColB	13500.00	\N	4190.00	2026.00	26Jul콜링우드B3	2 Bedrooms	\N	2026-07-18	2026-08-08	2026-07-20	3 Weeks	2026-07-18	180.00	2026-08-08	120.00
bd9b1677-580c-48dd-812e-7d2a8817a69b	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	C Package 2 Adult / 1 Child	21	\N	12700.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:16.606177	2026-04-16 23:42:32.001	\N	\N	fixed	\N	1500.00	C Package 2 Adult / 1 Child	26JuMlColC	11200.00	\N	3776.00	2026.00	26Jul콜링우드C3	2 Bedrooms	\N	2026-07-18	2026-08-08	2026-07-20	3 Weeks	2026-07-18	180.00	2026-08-08	120.00
5909ec58-1a91-4265-ad3b-f97df4900633	85e2c9ba-190f-44fc-9083-8a1ed9a1e57d	D Package 2 Adult / 2 Child	21	\N	15400.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:13:20.503267	2026-04-16 23:42:32.001	\N	\N	fixed	\N	1650.00	D Package 2 Adult / 2 Child	26JuMlColD	13750.00	\N	4232.00	2026.00	26Jul콜링우드D4	2 Bedrooms	\N	2026-07-18	2026-08-08	2026-07-20	3 Weeks	2026-07-18	190.00	2026-08-08	130.00
edf51c60-a52d-4aec-87cc-7567e7910e8b	3eda0426-7947-4640-a1fb-7f380179433d	E Package 1 Child Only	21	\N	7900.00	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-04-11 07:12:46.203013	2026-04-17 02:08:47.095	\N	\N	fixed	\N	1200.00	E Package 1 Child Only	26JuMlOakE	6700.00	\N	2903.00	\N	26Jul오클리E1	Homestay + Pick/Drop	460.00	2026-07-18	2026-08-08	2026-07-20	3 Weeks	2026-07-18	\N	2026-08-08	\N
cae9d750-af7e-4025-800f-6ba254764593	db62d171-7d0b-43b4-8bef-b68a5e6edc8c	A Package 1 Adult  & & 1 Child	21	\N	\N	\N	\N	\N	148000.00	\N	\N	\N	\N	active	2026-04-11 07:14:14.276969	2026-04-17 02:27:28.45	\N	\N	fixed	\N	20300.00	A Package 1 Adult  & & 1 Child	26JuPhLtA	127700.00	\N	58000.00	\N	26Jul푸켓캠프A2	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
52cf053b-6973-49e8-b6ea-b97b4dd8b5e2	db62d171-7d0b-43b4-8bef-b68a5e6edc8c	B Package 1 Adult  & & 2 Children	21	\N	\N	\N	\N	\N	245000.00	\N	\N	\N	\N	active	2026-04-11 07:14:17.980107	2026-04-17 02:27:28.45	\N	\N	fixed	\N	33600.00	B Package 1 Adult  & & 2 Children	26JuPhLtB	211400.00	\N	80000.00	\N	26Jul푸켓캠프B3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
c57904e7-d1db-4120-a7ba-dfd557057641	db62d171-7d0b-43b4-8bef-b68a5e6edc8c	C Package 2 Adult  & & 1 Children	21	\N	\N	\N	\N	\N	204000.00	\N	\N	\N	\N	active	2026-04-11 07:14:21.722616	2026-04-17 02:27:28.45	\N	\N	fixed	\N	31570.00	C Package 2 Adult  & & 1 Children	26JuPhLtC	172430.00	\N	77000.00	\N	26Jul푸켓캠프C3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
5be684e0-0b43-4c9f-948b-116292a314e0	db62d171-7d0b-43b4-8bef-b68a5e6edc8c	D Package 2 Adult  & & 2 Children	21	\N	\N	\N	\N	\N	266000.00	\N	\N	\N	\N	active	2026-04-11 07:14:25.537685	2026-04-17 02:27:28.45	\N	\N	fixed	\N	37840.00	D Package 2 Adult  & & 2 Children	26JuPhLtD	228160.00	\N	88000.00	\N	26Jul푸켓캠프D4	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
58120ef2-353a-48df-ae4e-29ab2ed64bc7	db62d171-7d0b-43b4-8bef-b68a5e6edc8c	E Package 1 care giver & & 1 Child	21	\N	\N	\N	\N	\N	162000.00	\N	\N	\N	\N	active	2026-04-11 07:14:29.308518	2026-04-17 02:27:28.45	\N	\N	fixed	\N	21450.00	E Package 1 care giver & & 1 Child	26JuPhLtE	140550.00	\N	65000.00	\N	26Jul푸켓캠프E1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
6fad8da9-893a-4f2e-a98a-839cf1a11a2c	db62d171-7d0b-43b4-8bef-b68a5e6edc8c	F Package 1 care giver & & 2 Children	21	\N	\N	\N	\N	\N	259000.00	\N	\N	\N	\N	active	2026-04-11 07:14:33.015934	2026-04-17 02:27:28.45	\N	\N	fixed	\N	29700.00	F Package 1 care giver & & 2 Children	26JuPhLtF	229300.00	\N	90000.00	\N	26Jul푸켓캠프F2	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


ALTER TABLE myagency.packages ENABLE TRIGGER ALL;

--
-- Data for Name: payment_headers; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.payment_headers DISABLE TRIGGER ALL;

COPY myagency.payment_headers (id, payment_ref, payment_date, total_amount, currency, payment_method, payment_type, received_from, paid_to, bank_reference, payment_info_id, notes, created_by, approved_by, status, created_on, modified_on, contract_id, invoice_id, organisation_id) FROM stdin;
\.


ALTER TABLE myagency.payment_headers ENABLE TRIGGER ALL;

--
-- Data for Name: payment_infos; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.payment_infos DISABLE TRIGGER ALL;

COPY myagency.payment_infos (id, name, payment_method, currency, description, is_default, status, created_on, modified_on) FROM stdin;
\.


ALTER TABLE myagency.payment_infos ENABLE TRIGGER ALL;

--
-- Data for Name: payment_lines; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.payment_lines DISABLE TRIGGER ALL;

COPY myagency.payment_lines (id, payment_header_id, invoice_id, contract_product_id, coa_code, split_type, amount, staff_id, description, created_on, organisation_id) FROM stdin;
\.


ALTER TABLE myagency.payment_lines ENABLE TRIGGER ALL;

--
-- Data for Name: payment_statements; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.payment_statements DISABLE TRIGGER ALL;

COPY myagency.payment_statements (id, statement_ref, statement_date, statement_scope, contract_id, student_account_id, total_paid_amount, total_outstanding, total_contract_amount, line_item_count, pdf_url, issued_by, sent_to_email, sent_at, issue_reason, notes, status, created_on, modified_on) FROM stdin;
\.


ALTER TABLE myagency.payment_statements ENABLE TRIGGER ALL;

--
-- Data for Name: pickup_mgt; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.pickup_mgt DISABLE TRIGGER ALL;

COPY myagency.pickup_mgt (id, contract_id, driver_id, pickup_type, from_location, to_location, pickup_datetime, vehicle_info, driver_notes, status, created_at, updated_at, ledger_entry_id, driver_name, driver_contact, product_id, service_fee, ap_cost, flight_no, timezone, is_active, pickup_no, flight_date, flight_time, pickup_message) FROM stdin;
12c4da15-128a-4460-9ec5-2d00a1b1a8a4	a89cbc95-af8a-42b5-b5af-7dcc28e764c6	\N	Pickup (Airport-Hotel)	Melbourne Airport	388 Lonsdale St, Melbourne	2026-07-18 19:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	TEST	\N	t	5	2026-07-18	10:00 PM	\N
7fa3f8e6-0e10-45cd-ac19-b95a07efb11e	a89cbc95-af8a-42b5-b5af-7dcc28e764c6	\N	Drop (Hotel-Airport)	388 Lonsdale St, Melbourne	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
df871a4d-a427-4f05-aad4-73de9585869d	d76bea55-68fa-4a62-a537-a94a16902391	\N	Pickup (Airport-Hotel)	Melbourne Airport	388 Lonsdale St, Melbourne	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
0fba7abd-c943-4029-81d1-2f2991571e79	d76bea55-68fa-4a62-a537-a94a16902391	\N	Drop (Hotel-Airport)	388 Lonsdale St, Melbourne	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
fb018090-3dcf-4064-bd4c-fc565f2ae8ea	3c7871d3-6722-446b-bcc6-39722b7e443d	\N	Pickup (Airport-Hotel)	Melbourne Airport	1384 Dandenong Rd, Hughesdale	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
d009e0e4-0ccc-44d2-9d22-cf8700932694	3c7871d3-6722-446b-bcc6-39722b7e443d	\N	Drop (Hotel-Airport)	1384 Dandenong Rd, Hughesdale	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
97df8909-b6d6-4751-a37e-43712bce59af	a82d9619-f105-405d-a1c7-5d51c4b1dcfc	\N	Pickup (Airport-Hotel)	Melbourne Airport	388 Lonsdale St, Melbourne	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
9ac4d7d6-2289-4037-9cb6-759dceaf6c46	a82d9619-f105-405d-a1c7-5d51c4b1dcfc	\N	Drop (Hotel-Airport)	388 Lonsdale St, Melbourne	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
eeb47f54-8f9a-4eaa-9813-cc198733c8c5	6d77ec2e-2080-422e-a36f-3235fc1b20db	\N	Pickup (Airport-Hotel)	Melbourne Airport	1384 Dandenong Rd, Hughesdale	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
967f16c5-c2c8-41f3-842f-09d600b46f0c	af574d96-22a4-40ac-80e6-38eb769abcc9	\N	Drop (Hotel-Airport)	1384 Dandenong Rd, Hughesdale	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
d658371a-8115-459c-9a4d-baea2d94b02e	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	Pickup (Airport-Hotel)	Melbourne Airport	388 Lonsdale St, Melbourne	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
7873724b-1230-4194-a68a-a14a93f135ff	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	Drop (Hotel-Airport)	388 Lonsdale St, Melbourne	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
a3f6dff1-c2cc-4ede-b501-8f419d932533	c2cf71a6-8877-40f1-8685-16c7fd32e805	\N	Drop (Hotel-Airport)	388 Lonsdale St, Melbourne	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
c64c63a7-b737-482f-b7cf-cd6ad09d0b01	ee54ee4c-5adf-4a40-acda-403c1bfced50	\N	Pickup (Airport-Hotel)	Melbourne Airport	1384 Dandenong Rd, Hughesdale	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
fb73fb49-d2b5-4140-b291-12f67d56c173	ee54ee4c-5adf-4a40-acda-403c1bfced50	\N	Drop (Hotel-Airport)	1384 Dandenong Rd, Hughesdale	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
3db60118-331a-409a-ab7e-8823e2081022	a93da133-21f8-4958-8cd5-9993048fb1b8	\N	Pickup (Airport-Hotel)	Melbourne Airport	1384 Dandenong Rd, Hughesdale	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
ccbb5dba-65ac-4909-b6fa-6fa72fd39500	a93da133-21f8-4958-8cd5-9993048fb1b8	\N	Drop (Hotel-Airport)	1384 Dandenong Rd, Hughesdale	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
a68ce759-cbb3-47dd-b8e0-239ee9d3420f	a3e30696-0225-483e-a287-752aeeb9a200	\N	Pickup (Airport-Hotel)	Melbourne Airport	388 Lonsdale St, Melbourne	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
0268f6d6-3278-4e07-a958-2e13b53924d8	a3e30696-0225-483e-a287-752aeeb9a200	\N	Drop (Hotel-Airport)	388 Lonsdale St, Melbourne	Melbourne Airport	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
bf7f95a7-419e-4836-a9ed-eb364ac965c6	20b6c86c-3c39-48be-a9ed-fcce5ab702c6	\N	Pickup (Airport-Hotel)	Melbourne Airport	1384 Dandenong Rd, Hughesdale	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
f2237696-4bd1-47f9-9fbf-e38f5f3a71dd	20b6c86c-3c39-48be-a9ed-fcce5ab702c6	\N	Drop (Hotel-Airport)	388 Lonsdale St, Melbourne	Melbourne Airport	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
9f31e8ad-b18f-406a-9d74-61633a94d3bb	3cda3dcc-2c4b-46fb-90b4-4836227db98c	\N	Pickup (Airport-Hotel)	Melbourne Airport	550 Flinders St, Melbourne	2026-07-25 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-25	\N	\N
65c83a4a-7ef8-463b-b708-ce6908928aa9	3cda3dcc-2c4b-46fb-90b4-4836227db98c	\N	Drop (Hotel-Airport)	550 Flinders St, Melbourne	Melbourne Airport	2026-08-15 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-15	\N	\N
34d6ef86-0061-4c66-9534-6c9d6e97ac7b	461c6292-fb62-41f1-840a-d8dcb94a2a89	\N	Pickup (Airport-Hotel)	Melbourne Airport	388 Lonsdale St, Melbourne	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
650f6125-4185-4020-aa9b-8bccea15ee21	461c6292-fb62-41f1-840a-d8dcb94a2a89	\N	Drop (Hotel-Airport)	388 Lonsdale St, Melbourne	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
796d2ebf-1eb8-41b9-8811-7979776591a9	c1ed920a-cf61-4015-a0ba-bfc7fd25d2cd	\N	Pickup (Airport-Hotel)	Melbourne Airport	388 Lonsdale St, Melbourne	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
e4e16dc5-2bdc-499d-90f3-be5c8c7bf191	c1ed920a-cf61-4015-a0ba-bfc7fd25d2cd	\N	Drop (Hotel-Airport)	388 Lonsdale St, Melbourne	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
79dde47e-d708-4b39-9d0b-6a3cf696a265	a80eef58-2a15-4a7d-8566-69fd824d2313	\N	Pickup (Airport-Hotel)	Townsville Airport	1A Sporting Dr, Thuringowa Central	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
e943bd09-9472-4158-9d89-b46f16d9f5cc	a80eef58-2a15-4a7d-8566-69fd824d2313	\N	Drop (Hotel-Airport)	1A Sporting Dr, Thuringowa Central	Townsville Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
ada49426-bc62-4201-b542-1a71aef37cb0	bfc32694-5d78-4a94-aebb-87902d57154d	\N	Pickup (Airport-Hotel)	Melbourne Airport	1384 Dandenong Rd, Hughesdale	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
c527d6be-642a-45f1-a2cb-cea81483ee0b	bfc32694-5d78-4a94-aebb-87902d57154d	\N	Drop (Hotel-Airport)	1384 Dandenong Rd, Hughesdale	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
80a8d004-5fa3-41c7-9875-694593e1d4ed	d440f5c0-aa75-4c7b-afab-673a3168f07e	\N	Pickup (Airport-Hotel)	Melbourne Airport	1384 Dandenong Rd, Hughesdale	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
9f9660ed-4f06-4662-8b05-753806ac9b22	d440f5c0-aa75-4c7b-afab-673a3168f07e	\N	Drop (Hotel-Airport)	1384 Dandenong Rd, Hughesdale	Melbourne Airport	2026-08-22 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-22	\N	\N
aa6842f3-678b-4abf-a4b2-4d561210d75b	27a7de5a-55cc-420f-bbb3-d39a985828a9	\N	Pickup (Airport-Hotel)	Melbourne Airport	1384 Dandenong Rd, Hughesdale	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
a95b2adc-2533-4a34-8ccb-4d493c43f3cf	27a7de5a-55cc-420f-bbb3-d39a985828a9	\N	Drop (Hotel-Airport)	1384 Dandenong Rd, Hughesdale	Melbourne Airport	2026-08-22 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-22	\N	\N
239f54a2-7018-41ae-b14d-f2aa40330944	e5cf9530-24d2-435d-8b2b-9f70bf75d7ab	\N	Pickup (Airport-Hotel)	Melbourne Airport	1384 Dandenong Rd, Hughesdale	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
6fa5ca3f-c2d1-4d23-8a22-8e7cd8902d23	e5cf9530-24d2-435d-8b2b-9f70bf75d7ab	\N	Drop (Hotel-Airport)	1384 Dandenong Rd, Hughesdale	Melbourne Airport	2026-08-22 00:00:00	\N	\N	pending	2026-04-12 04:06:17.80643	2026-04-12 04:06:17.80643	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-22	\N	\N
7047800b-d4f4-462c-b98a-bb76560d2794	6d77ec2e-2080-422e-a36f-3235fc1b20db	\N	Pickup (Airport-Hotel)	Melbourne Airport	1384 Dandenong Rd, Hughesdale	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:08:52.76181	2026-04-12 04:08:52.76181	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
84c9ff24-6084-437d-8a06-6c683f3be0fa	af574d96-22a4-40ac-80e6-38eb769abcc9	\N	Drop (Hotel-Airport)	1384 Dandenong Rd, Hughesdale	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:08:52.76181	2026-04-12 04:08:52.76181	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
51f474c2-51d8-4caf-9566-0e4577046904	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	Pickup (Airport-Hotel)	Melbourne Airport	388 Lonsdale St, Melbourne	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:08:52.76181	2026-04-12 04:08:52.76181	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
52d5f219-9a2a-4065-ac3a-8f37ee7d990e	c2cf71a6-8877-40f1-8685-16c7fd32e805	\N	Drop (Hotel-Airport)	388 Lonsdale St, Melbourne	Melbourne Airport	2026-08-08 00:00:00	\N	\N	pending	2026-04-12 04:08:52.76181	2026-04-12 04:08:52.76181	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-08-08	\N	\N
cad1cccd-2315-4710-8994-16111a43706f	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	Pickup (Airport-Hotel)	Melbourne Airport	388 Lonsdale St, Melbourne	2026-07-18 00:00:00	\N	\N	pending	2026-04-12 04:08:52.76181	2026-04-12 04:08:52.76181	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2026-07-18	\N	\N
\.


ALTER TABLE myagency.pickup_mgt ENABLE TRIGGER ALL;

--
-- Data for Name: product_cost_lines; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.product_cost_lines DISABLE TRIGGER ALL;

COPY myagency.product_cost_lines (id, contract_product_id, cost_type, partner_id, staff_id, calc_type, rate, base_amount, calculated_amount, coa_code, description, status, paid_at, payment_header_id, created_on, modified_on) FROM stdin;
\.


ALTER TABLE myagency.product_cost_lines ENABLE TRIGGER ALL;

--
-- Data for Name: product_groups; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.product_groups DISABLE TRIGGER ALL;

COPY myagency.product_groups (id, name, description, status, created_on, modified_on) FROM stdin;
aaf89896-66e9-46e9-8fee-3c41799620c0	Job Placement	Job placement and employment support services connecting clients with industry employers, including farm work and industry-specific placements.	Active	2026-01-13 12:51:00	2026-04-12 07:35:59.320277
c3bd5c56-3142-46b0-97c8-610515ee3cf9	Settlement Service	Arrival and settlement support services to help clients adapt to their new environment, including SIM cards, bank account setup, and local orientation.	Active	2026-01-13 12:51:00	2026-04-12 07:35:59.320277
f9663e60-1123-4966-8dac-734fc4637df2	Visa Service	Visa application assistance and processing support for student visas, visitor visas, working holiday visas, and other Australian visa subclasses.	Active	2026-01-13 12:51:00	2026-04-12 07:35:59.320277
78097316-9dc2-40de-897c-caec30c94816	Internship Program	Internship and work experience placement programs connecting students with relevant employers for structured professional development.	Active	2026-01-13 12:51:00	2026-04-12 07:35:59.320277
58d98097-8b20-4323-8de4-46144537f577	Health Examination Service	Medical health examination arrangement and support required for visa applications, school enrolment, and pre-departure health checks.	Active	2026-01-13 12:51:00	2026-04-12 07:35:59.320277
0f2b8ace-4df9-4150-beac-167c7689ca92	Insurance Service	Insurance policy guidance and application services including Overseas Student Health Cover (OSHC), travel insurance, and general personal insurance.	Active	2026-01-13 12:51:00	2026-04-12 07:35:59.320277
0af25083-f823-42bb-bc9d-1e3cbc84eda0	Accommodation Service	Accommodation search, arrangement, and booking support for students and clients, including rental, student housing, and short-stay options.	Active	2026-01-13 12:51:00	2026-04-12 07:35:59.320277
f7e285ee-79dc-4a91-947d-d98db8decbf7	Homestay Placement	Homestay family matching and placement service providing students with accommodation and a family environment with a local host family.	Active	2026-01-13 12:51:00	2026-04-12 07:35:59.320277
9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	Education Service	Educational program and school placement services covering primary, secondary, and tertiary institutions across a broad range of academic programs.	Active	2026-01-13 12:51:00	2026-04-12 07:35:59.320277
2d76ab00-8ff6-40be-9aa1-01c70e35d62c	Migration Service	Migration and immigration consulting services covering visa strategy, application preparation, compliance, and ongoing status management.	Active	2026-01-13 12:51:00	2026-04-12 07:35:59.320277
e1b286bf-f9f4-4732-aaa9-5355c41bad07	Tour Service	Guided tour and travel experience services including day tours to local attractions, cultural destinations, and regional highlights.	Active	2026-04-12 07:20:05.041687	2026-04-12 07:35:59.320277
49481dab-2bb0-47f0-bceb-614a54b14f7d	Other	Miscellaneous services and products that do not fall under a specific service category.	Active	2026-04-12 07:20:05.077194	2026-04-12 07:35:59.320277
2bb7e8c7-d683-4376-9b27-cb79766dd57c	Package Program	Bundled service packages combining education, accommodation, and support services for short-term schooling and camp programs.	Active	2026-04-12 15:59:00	2026-04-12 07:35:59.320277
\.


ALTER TABLE myagency.product_groups ENABLE TRIGGER ALL;

--
-- Data for Name: product_types; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.product_types DISABLE TRIGGER ALL;

COPY myagency.product_types (id, name, product_group_id, service_module_type, description, status, created_on, modified_on) FROM stdin;
8fa718c5-ee9c-4517-8c29-ad389a599b4b	Accommodation Service	0af25083-f823-42bb-bc9d-1e3cbc84eda0	accommodation	General accommodation search, arrangement, and booking support for students and clients.	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
ba9167e7-9821-44d9-af0e-27f8f4697e5a	Aupair / Demi-pair	f7e285ee-79dc-4a91-947d-d98db8decbf7	accommodation	Au pair and demi-pair placement service matching students with host families for cultural exchange and childcare assistance.	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
72cab693-053d-4eba-b796-b733109a9c5f	Homestay Placement	f7e285ee-79dc-4a91-947d-d98db8decbf7	accommodation	Homestay family matching and placement service providing accommodation with a local host family.	Active	2026-01-13 12:52:00	2026-01-13 17:20:00
857ad357-78c1-4672-8a54-00e2104dfb80	Industry Placement	aaf89896-66e9-46e9-8fee-3c41799620c0	internship	Structured industry placement program connecting students with relevant employers for work experience.	Active	2026-01-13 16:52:00	2026-01-13 16:52:00
5d6d997c-aa05-4d37-b277-7092a4e84e49	Farm Job	aaf89896-66e9-46e9-8fee-3c41799620c0	internship	Farm and agricultural work placement for visa holders seeking regional employment opportunities.	Active	2026-01-13 16:52:00	2026-01-13 16:52:00
219366cd-6b25-44f8-b1dc-da5d6cc90031	Internship Service	78097316-9dc2-40de-897c-caec30c94816	internship	Internship placement and coordination service offering practical work experience in a professional environment.	Active	2026-01-13 12:52:00	2026-01-13 17:13:00
b5f8da21-f5a8-49f8-b415-4bd1df520f78	Migration Service	2d76ab00-8ff6-40be-9aa1-01c70e35d62c	settlement	Migration and immigration consulting services including visa strategy, application, and compliance support.	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
44ff3d00-85da-4d47-ac54-d853d2844a56	Settlement Service	c3bd5c56-3142-46b0-97c8-610515ee3cf9	settlement	Arrival and settlement support services including SIM cards, bank account setup, and local orientation.	Active	2026-01-13 12:52:00	2026-01-13 17:13:00
4f55ee13-d416-4f57-83ae-06625bcf12c7	Airport Pickup	c3bd5c56-3142-46b0-97c8-610515ee3cf9	pickup	Airport arrival pickup and transfer service to accommodation or designated location.	Active	2026-01-13 12:52:00	2026-01-13 17:13:00
b878289d-7c9d-4b71-89e5-5d07415afded	Visa Service	f9663e60-1123-4966-8dac-734fc4637df2	visa	Visa application assistance and processing support including student visa, visitor visa, and working holiday visa.	Active	2026-01-13 12:52:00	2026-01-13 17:12:00
b4165326-4575-4cc7-a426-2d2ec4e01a01	Day Tour	e1b286bf-f9f4-4732-aaa9-5355c41bad07	tour	Guided day tour packages to local attractions and destinations for leisure and cultural experience.	Active	2026-01-13 12:52:00	2026-02-26 15:20:00
69a90135-8a1c-4207-a3a1-1abaabd25692	Health Examination Service	58d98097-8b20-4323-8de4-46144537f577	other	Medical health examination arrangement and support required for visa applications and enrolment.	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
0a83bd84-e657-4f3d-bd2d-0c77777b7472	Insurance Service	0f2b8ace-4df9-4150-beac-167c7689ca92	other	Insurance policy guidance and application support including OSHC, travel, and general insurance.	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
7155170f-96e1-4547-a52f-a163d7fe8b65	Other	49481dab-2bb0-47f0-bceb-614a54b14f7d	other	Miscellaneous services not categorised under a specific product type.	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
e7320fb4-339b-484c-93e8-4f4e96e934db	Education Consulting	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Professional education consulting services including school selection, application support, and academic pathway planning.	Active	2026-01-13 17:14:00	2026-01-13 17:14:00
8a6e2538-d4d8-4556-a1be-a7f175cc9531	Short-term Schooling Package	2bb7e8c7-d683-4376-9b27-cb79766dd57c	study_abroad	Bundled package combining short-term school enrolment with accommodation and support services.	Active	2026-04-12 16:01:00	2026-04-12 16:01:00
a5dc9e39-9823-4b04-a3df-18ed2988566c	Summer Camp Package	2bb7e8c7-d683-4376-9b27-cb79766dd57c	study_abroad	Summer camp program package including educational activities, sports, and recreational experiences during the school holiday period.	Active	2026-04-12 16:01:00	2026-04-12 16:01:00
24a4f93e-bb22-4c7f-a83c-75cef8d2b722	English Camp Package	2bb7e8c7-d683-4376-9b27-cb79766dd57c	study_abroad	Short-term English language camp program combining language learning with cultural and recreational activities.	Active	2026-04-12 16:01:00	2026-04-12 16:01:00
66a7f4e7-7b40-4a26-836a-7d30471c0ef0	Short Course	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Short-term non-award course or workshop covering specific skills or subject areas.	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
9463166e-93a1-493a-a3ee-87dc14f23ec9	Education Service	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	General education and school placement services covering a broad range of academic programs.	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
586e87af-d210-4c9b-aa52-e9da71c90695	ELICOS	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	English Language Intensive Courses for Overseas Students — general and academic English programs for international students.	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
80454f33-3dff-417f-bfbc-e93ac36e12da	Certificate I	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Certificate I qualification under the Australian Qualifications Framework (AQF Level 1).	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
2026f4bc-26ca-4897-a136-100c7506b05b	Doctoral Degree	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Doctoral Degree (PhD) qualification under the Australian Qualifications Framework (AQF Level 10).	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
7c69adba-ba23-4739-b122-c67995db9803	Diploma	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Diploma qualification under the Australian Qualifications Framework (AQF Level 5).	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
33b259bf-2209-435b-a19a-ac76ffce2a9b	Bachelor Degree	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Bachelor Degree qualification under the Australian Qualifications Framework (AQF Level 7).	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
5dc52f62-5ac1-4848-bb3f-2fdfddbc5e6f	Associate Degree	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Associate Degree qualification under the Australian Qualifications Framework (AQF Level 6).	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
27d6b72b-a930-499b-bffb-30ad331fab04	Masters Degree	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Masters Degree qualification under the Australian Qualifications Framework (AQF Level 9).	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
bd32a2c7-f62b-4906-9e9b-f4bb8effef68	Certificate IV	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Certificate IV qualification under the Australian Qualifications Framework (AQF Level 4).	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
9d58b8c2-8712-4aff-8a55-aa0412efcf9f	Schooling_Standard	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Standard school enrolment program for students attending primary or secondary school for a full academic term or year.	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
76b0db8a-6e50-4815-aa74-2a99232ad02b	Schooling_Short-term	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Short-term school enrolment program for students attending primary or secondary school for a limited period.	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
9f0c94f8-7881-4db2-b214-996986ea0ea7	Certificate III	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Certificate III qualification under the Australian Qualifications Framework (AQF Level 3).	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
b0e13a9f-e2af-4177-9c55-7c291cecbae4	Graduate Diploma	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Graduate Diploma qualification under the Australian Qualifications Framework (AQF Level 8).	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
1cf97ed6-67a1-4ec3-9c9d-1084f567f8ea	Non AQF Award	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Non-AQF accredited qualification or short program not formally recognised within the Australian Qualifications Framework.	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
1fbb0719-6120-4407-ac5f-c934fc08ab08	Advanced Diploma	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Advanced Diploma qualification under the Australian Qualifications Framework (AQF Level 6).	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
ab2b876e-f6d2-4701-af8c-08c770466f46	Certificate II	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Certificate II qualification under the Australian Qualifications Framework (AQF Level 2).	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
8af680db-0f66-4949-8274-191602582808	Graduate Certificate	9e96e911-2f63-4dbe-b1a9-6a9ca734c28f	study_abroad	Graduate Certificate qualification under the Australian Qualifications Framework (AQF Level 8).	Active	2026-01-13 12:52:00	2026-01-13 16:50:00
\.


ALTER TABLE myagency.product_types ENABLE TRIGGER ALL;

--
-- Data for Name: products; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.products DISABLE TRIGGER ALL;

COPY myagency.products (id, provider_account_id, product_name, product_type, description, cost, currency, status, created_at, updated_at, unit, service_module_type, manual_input, from_date, to_date, duration_weeks, category_1_id, category_2_id, item_description, price, is_gst_included, installment_plan, default_payment_term, number_of_payments, minimum_payment, product_priority, avetmiss_product_id, is_vet_in_schools, product_grade, is_recommend, provider_id, commission_id, promotion_id, display_on_quote, display_on_invoice, tax_rate_id, product_type_id, modified_on, product_context, camp_package_id, product_images, country, city, location) FROM stdin;
2a517c57-352b-45b0-8565-e749ca4ab754	3861f16e-7a7e-436c-9185-355cf1233613	Homestay_Single Room (Over 18)-Standard	Homestay Placement	Private single room homestay for students aged 18 and over — standard package including breakfast and dinner with the host family and basic household amenities.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	accommodation	f	2026-01-13	\N	\N	\N	\N	2 meals Monday to Friday, 3 meals on weekends	420.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	72cab693-053d-4eba-b796-b733109a9c5f	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
c1a88e37-dcfd-4bb8-8e24-0c94042f384a	3861f16e-7a7e-436c-9185-355cf1233613	Homestay_Single Room (Over 18)-Complete	Homestay Placement	Private single room homestay for students aged 18 and over — complete package including all meals, airport pickup, local orientation, and student support services.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	accommodation	f	2026-01-13	\N	\N	\N	\N	3 meals, 7 days per week	450.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	72cab693-053d-4eba-b796-b733109a9c5f	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
6bb6fcd6-15db-4667-87b0-d3e566f766d8	3861f16e-7a7e-436c-9185-355cf1233613	Homestay_Shared Room (Over 18)-Standard	Homestay Placement	Shared room homestay accommodation for students aged 18 and over — standard package including breakfast and dinner with the host family and basic household amenities.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	accommodation	f	2026-01-13	\N	\N	\N	\N	2 meals Monday to Friday, 3 meals on weekends	390.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	72cab693-053d-4eba-b796-b733109a9c5f	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
3474d893-0654-4725-89bf-077a9a7c616e	3861f16e-7a7e-436c-9185-355cf1233613	Homestay_SharedRoom (Over 18)-Complete	Homestay Placement	Shared room homestay accommodation for students aged 18 and over — complete package including all meals, airport pickup, local orientation, and student support services.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	accommodation	f	2026-01-13	\N	\N	\N	\N	3 meals, 7 days per week	420.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	72cab693-053d-4eba-b796-b733109a9c5f	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
e1ee8b71-79ab-49e6-ba16-fe5cb5d14a75	3861f16e-7a7e-436c-9185-355cf1233613	Homestay_Single Room (Under 18)-Standard	Homestay Placement	Private single room homestay for students under 18 — standard package including breakfast and dinner with the host family and basic household amenities.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	accommodation	f	2026-01-13	\N	\N	\N	\N	2 meals Monday to Friday, 3 meals on weekends	440.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	72cab693-053d-4eba-b796-b733109a9c5f	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
9c390c09-5010-451c-9f6b-0fdc878f5d90	3861f16e-7a7e-436c-9185-355cf1233613	Homestay_Single Room (Under 18)-Complete	Homestay Placement	Private single room homestay for students under 18 — complete package including all meals, airport pickup, local orientation, and ongoing welfare and guardian support.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	accommodation	f	2026-01-13	\N	\N	\N	\N	3 meals, 7 days per week	470.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	72cab693-053d-4eba-b796-b733109a9c5f	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
08da44d0-5c72-4136-979b-177603fac874	3861f16e-7a7e-436c-9185-355cf1233613	Homestay_Shared Room (Under 18)-Standard	Homestay Placement	Shared room homestay accommodation for students under 18 — standard package including breakfast and dinner with the host family and basic household amenities.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	accommodation	f	2026-01-13	\N	\N	\N	\N	2 meals Monday to Friday, 3 meals on weekends	410.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	72cab693-053d-4eba-b796-b733109a9c5f	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
3a789a83-be51-4fdc-8108-55c85bf10790	3861f16e-7a7e-436c-9185-355cf1233613	Homestay_Shared Room (Under 18)-Complete	Homestay Placement	Shared room homestay accommodation for students under 18 — complete package including all meals, airport pickup, local orientation, and ongoing welfare support.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	accommodation	f	2026-01-13	\N	\N	\N	\N	3 meals, 7 days per week	440.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	72cab693-053d-4eba-b796-b733109a9c5f	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
3148fea2-9e3d-4d70-a4ed-1a60aff772c0	78606362-6a21-43e3-9594-5d437f55c9fb	Extra Child Tuition Fee Only	Education	Supplementary tuition fee for an additional child enrolled in the same short-term academic program, applicable when two or more children from the same family attend together.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	study_abroad	f	\N	\N	\N	\N	\N	\N	3000.00	f	\N	\N	\N	\N	9	\N	f	B	f	78606362-6a21-43e3-9594-5d437f55c9fb	\N	\N	t	t	\N	9463166e-93a1-493a-a3ee-87dc14f23ec9	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
23492add-5fcc-480e-82e1-53d3455f6bbb	78606362-6a21-43e3-9594-5d437f55c9fb	Upgrade to Grade 7-9 (for 3 weeks)	Education	Tuition fee upgrade for students advancing to Grade 7–9 level subjects during a 3-week short-term school program, reflecting the higher course level and resources required.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	study_abroad	f	\N	\N	\N	\N	\N	\N	520.00	f	\N	\N	\N	\N	9	\N	f	B	f	78606362-6a21-43e3-9594-5d437f55c9fb	\N	\N	t	t	\N	9463166e-93a1-493a-a3ee-87dc14f23ec9	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
6fee53b9-167d-460f-b9bc-46a558d001be	92a1e82d-3b3d-4ddc-9a27-d57551037488	Upgrade Room (Single to 2 Bedrooms)	Accommodation	Room upgrade from a single room to a 2-bedroom unit, providing additional space and privacy for the duration of the stay.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	accommodation	f	\N	\N	\N	\N	\N	\N	100.00	f	\N	\N	\N	\N	9	\N	f	B	f	92a1e82d-3b3d-4ddc-9a27-d57551037488	\N	\N	t	t	\N	8fa718c5-ee9c-4517-8c29-ad389a599b4b	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
3499ef3b-628d-4151-a0a9-96a0aef1d5cd	92a1e82d-3b3d-4ddc-9a27-d57551037488	Extra Night - 1 Bedroom	Accommodation	Additional night accommodation charge for a 1-bedroom unit, applied when the stay is extended beyond the standard booking period.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	accommodation	f	\N	\N	\N	\N	\N	\N	185.00	f	\N	\N	\N	\N	9	\N	f	B	f	92a1e82d-3b3d-4ddc-9a27-d57551037488	\N	\N	t	t	\N	8fa718c5-ee9c-4517-8c29-ad389a599b4b	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
3008d0d4-1483-463f-a165-0e706fbb3b2a	92a1e82d-3b3d-4ddc-9a27-d57551037488	Extra Night - 2 Bedroom2	Accommodation	Additional night accommodation charge for a 2-bedroom unit, applied when the stay is extended beyond the standard booking period.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	accommodation	f	\N	\N	\N	\N	\N	\N	285.00	f	\N	\N	\N	\N	9	\N	f	B	f	92a1e82d-3b3d-4ddc-9a27-d57551037488	\N	\N	t	t	\N	8fa718c5-ee9c-4517-8c29-ad389a599b4b	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
325dd950-c57c-46ad-b06c-bc6c0f39a094	3861f16e-7a7e-436c-9185-355cf1233613	Airport Pickup with Family	Airport Pickup	Airport arrival pickup service accommodating the student together with accompanying family members in a suitable vehicle.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	pickup	f	\N	\N	\N	\N	\N	\N	50.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	4f55ee13-d416-4f57-83ae-06625bcf12c7	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
59fb8fd2-94f1-445c-b4a9-6614337379dd	3861f16e-7a7e-436c-9185-355cf1233613	Airport Pickup	Airport Pickup	Standard airport arrival pickup and transfer service to the student's accommodation address upon arrival in Australia.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	pickup	f	\N	\N	\N	\N	\N	\N	140.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	4f55ee13-d416-4f57-83ae-06625bcf12c7	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
c5d1ad26-0d7e-4151-b905-2b7be0a77775	dbcecfa8-a283-4213-b101-5af0dfd71fad	Great Ocean Road	Day Tour	Scenic guided day tour along the iconic Great Ocean Road, featuring the Twelve Apostles, Loch Ard Gorge, and breathtaking coastal landscapes of Victoria.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	tour	f	\N	\N	\N	\N	\N	\N	165.00	f	\N	\N	\N	\N	9	\N	f	B	f	dbcecfa8-a283-4213-b101-5af0dfd71fad	\N	\N	t	t	\N	b4165326-4575-4cc7-a426-2d2ec4e01a01	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
e1036432-f933-4d71-b8a6-e69bfb4e2231	dbcecfa8-a283-4213-b101-5af0dfd71fad	Puffing Billy & Phillip Island	Day Tour	Combined day tour featuring a scenic ride on the historic Puffing Billy steam train through the Dandenong Ranges and a visit to Phillip Island's famous Penguin Parade at sunset.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	tour	f	\N	\N	\N	\N	\N	\N	280.00	f	\N	\N	\N	\N	9	\N	f	B	f	dbcecfa8-a283-4213-b101-5af0dfd71fad	\N	\N	t	t	\N	b4165326-4575-4cc7-a426-2d2ec4e01a01	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
65cb5dd2-996c-49ec-a0dd-40e9250ad87e	dbcecfa8-a283-4213-b101-5af0dfd71fad	Sovereign Hill	Day Tour	Day tour to Sovereign Hill in Ballarat — an open-air museum recreating the 1850s gold rush era with live demonstrations, gold panning activities, and historical re-enactments.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	tour	f	\N	\N	\N	\N	\N	\N	195.00	f	\N	\N	\N	\N	9	\N	f	B	f	dbcecfa8-a283-4213-b101-5af0dfd71fad	\N	\N	t	t	\N	b4165326-4575-4cc7-a426-2d2ec4e01a01	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
c7ed2712-202f-4e21-a317-313072da1054	3861f16e-7a7e-436c-9185-355cf1233613	Kindergarten_Service Fee	Kindergarten	Service coordination and management fee for kindergarten student placement, covering ongoing communication with the school, welfare check-ins, and administrative support.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	study_abroad	f	\N	\N	\N	\N	\N	\N	200.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	9d58b8c2-8712-4aff-8a55-aa0412efcf9f	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
e6caba24-a50c-48ef-bcea-287881b92925	\N	Great Barrier Reef Cruise	Day Tour	Guided day cruise to the Great Barrier Reef, one of Australia's most iconic natural wonders, featuring snorkelling, marine life encounters, and glass-bottom boat experiences.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:46:08.55906	\N	tour	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	9	\N	f	B	f	\N	\N	\N	t	t	\N	b4165326-4575-4cc7-a426-2d2ec4e01a01	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
5e539acf-50d6-4e7e-8fbd-3e3f68852de7	\N	Magnetic Island Tour	Day Tour	Guided day tour to Magnetic Island near Townsville, featuring pristine beaches, wildlife encounters including koalas, and stunning views of the Coral Sea.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:46:08.55906	\N	tour	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	9	\N	f	B	f	\N	\N	\N	t	t	\N	b4165326-4575-4cc7-a426-2d2ec4e01a01	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
be8d619a-fd45-4cfc-aaa3-5d8b9b0ff2cc	3861f16e-7a7e-436c-9185-355cf1233613	Settlement Service	Settlement Service	Comprehensive arrival and settlement service including local orientation, essential setup support such as bank account opening, SIM card activation, and community and school introduction.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	settlement	f	2026-01-13	\N	\N	\N	\N	TFN, Mobile Phone, Banking	200.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	44ff3d00-85da-4d47-ac54-d853d2844a56	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
349bbac2-c59d-495a-a08d-a216b0bd881d	3861f16e-7a7e-436c-9185-355cf1233613	Visa Service	Visa Service	Professional visa application assistance service covering document preparation, application lodgement support, and compliance guidance for Australian student and visitor visa subclasses.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	visa	f	2026-01-13	\N	\N	\N	\N	Student Visa Only	500.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	b878289d-7c9d-4b71-89e5-5d07415afded	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
e9fdc5ea-f0c3-497e-a6b6-e4b41e6f1996	3861f16e-7a7e-436c-9185-355cf1233613	School Information	Education Consulting	Professional education consulting service providing detailed guidance on school options, curriculum overviews, enrolment procedures, and academic pathway planning for prospective students and families.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	study_abroad	f	2026-01-13	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	e7320fb4-339b-484c-93e8-4f4e96e934db	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
74475ce7-539f-4256-8c1e-b6a3ba893fea	3861f16e-7a7e-436c-9185-355cf1233613	Vodafone Prepaid $35	Settlement Service	Vodafone Australia prepaid SIM card valued at AUD $35, providing mobile data, calls, and SMS connectivity for newly arrived students during their initial settlement period.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	settlement	f	2026-01-13	\N	\N	\N	\N	\N	35.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	44ff3d00-85da-4d47-ac54-d853d2844a56	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
847f1c82-0c4a-46d5-95a8-817e8664b2c4	3861f16e-7a7e-436c-9185-355cf1233613	Airport Pick-up Service	Airport Pickup	Professional airport arrival pickup service transferring students from the airport to their designated accommodation address.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	pickup	f	2026-01-13	\N	\N	\N	\N	\N	190.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	4f55ee13-d416-4f57-83ae-06625bcf12c7	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
04194175-6541-4aa8-a012-6bf03d5e87ac	3861f16e-7a7e-436c-9185-355cf1233613	Internship Program	Internship Service	Structured internship placement program providing practical work experience in a professional Australian workplace, coordinated to align with the student's field of study or career interest.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	internship	f	2026-01-13	\N	\N	\N	\N	\N	1400.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	219366cd-6b25-44f8-b1dc-da5d6cc90031	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
45141974-b219-4a9a-8dbf-33dec81b7c8a	3861f16e-7a7e-436c-9185-355cf1233613	Kindergarten_Enrollment	Kindergarten	One-time enrolment and administration fee for new kindergarten students, covering registration, placement processing, and initial program setup.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	study_abroad	f	\N	\N	\N	\N	\N	\N	300.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	9d58b8c2-8712-4aff-8a55-aa0412efcf9f	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
55eab42e-dd4d-4aa4-bed2-e8eab442a1d9	3861f16e-7a7e-436c-9185-355cf1233613	Local Support Service	Settlement Service	On-ground local support service providing day-to-day assistance including transport guidance, community introduction, shopping support, and help navigating local services after arrival.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	settlement	f	2026-01-13	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	44ff3d00-85da-4d47-ac54-d853d2844a56	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
66b33d4f-8c9a-4d32-8962-7e4be447cf5a	3861f16e-7a7e-436c-9185-355cf1233613	Homestay Placement	Homestay Placement	Homestay family matching and placement service connecting students with a suitable local host family, including initial family introduction and placement coordination.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	accommodation	f	2026-01-13	\N	\N	\N	\N	\N	400.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	72cab693-053d-4eba-b796-b733109a9c5f	2026-04-12 05:46:08.55906	general	\N	[]	\N	\N	\N
a7df7108-3eea-4e8b-8a18-e11bffe37df8	3861f16e-7a7e-436c-9185-355cf1233613	Kindergarten Tuition Fee	Kindergarten	Tuition fee for early childhood education (kindergarten) program, covering structured learning activities, classroom instruction, and educational materials for the enrolment period.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	study_abroad	f	\N	\N	\N	\N	\N	\N	180.00	f	\N	\N	\N	\N	9	\N	f	B	f	3861f16e-7a7e-436c-9185-355cf1233613	\N	\N	t	t	\N	9d58b8c2-8712-4aff-8a55-aa0412efcf9f	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
e269e241-4249-4e9b-9d57-f8ef9802d5e8	d3d38f8a-8931-4177-b369-377a396bfc18	Vodafone Prepaid Simcard	Settlement Service	Vodafone Australia prepaid SIM card supply and activation service for newly arrived students, ensuring immediate mobile connectivity upon arrival in Australia.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	settlement	f	\N	\N	\N	\N	\N	\N	35.00	f	\N	\N	\N	\N	9	\N	f	B	f	d3d38f8a-8931-4177-b369-377a396bfc18	\N	\N	t	t	\N	44ff3d00-85da-4d47-ac54-d853d2844a56	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
294c1196-ece4-4776-95c7-e30dae83d37f	db13db39-4435-4305-af97-94b9e5b5f97f	Miki Card - Adult	Transport	Adult Miki tourist transport card providing unlimited access to local buses and selected transport services, valid for the duration of the program period.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	pickup	f	\N	\N	\N	\N	\N	\N	36.00	f	\N	\N	\N	\N	9	\N	f	B	f	db13db39-4435-4305-af97-94b9e5b5f97f	\N	\N	t	t	\N	4f55ee13-d416-4f57-83ae-06625bcf12c7	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
2e7e1c2e-f96d-4299-8073-0b1110bc2eaa	db13db39-4435-4305-af97-94b9e5b5f97f	Miki Card - Child	Transport	Child Miki tourist transport card providing unlimited access to local buses and selected transport services for student children, valid for the duration of the program period.	\N	AUD	active	2026-04-12 05:46:08.55906	2026-04-12 05:51:16.104961	\N	pickup	f	\N	\N	\N	\N	\N	\N	18.00	f	\N	\N	\N	\N	9	\N	f	B	f	db13db39-4435-4305-af97-94b9e5b5f97f	\N	\N	t	t	\N	4f55ee13-d416-4f57-83ae-06625bcf12c7	2026-04-12 05:46:08.55906	general	\N	[]	\N	Melbourne	\N
\.


ALTER TABLE myagency.products ENABLE TRIGGER ALL;

--
-- Data for Name: program_reports; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.program_reports DISABLE TRIGGER ALL;

COPY myagency.program_reports (id, contract_id, report_title, status, generated_by, published_at, summary_notes, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE myagency.program_reports ENABLE TRIGGER ALL;

--
-- Data for Name: promotions; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.promotions DISABLE TRIGGER ALL;

COPY myagency.promotions (id, name, product_id, account_id, from_date, to_date, promotion_price, status, created_on, modified_on) FROM stdin;
\.


ALTER TABLE myagency.promotions ENABLE TRIGGER ALL;

--
-- Data for Name: quote_products; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.quote_products DISABLE TRIGGER ALL;

COPY myagency.quote_products (id, quote_id, product_name, description, qty, unit_price, gst_rate, total, service_module_type, sort_order, created_on, product_id, manual_input, name, item_description, price, quantity, is_initial_payment, due_date, sort_index, is_gst_included, status, modified_on, provider_account_id, organisation_id) FROM stdin;
75832261-4f63-41b6-8f74-93aaaa5c0341	bbbb0001-0000-0000-0000-000000000001	ELICOS 24 Weeks	General English Course at BROWNS	1	9600.00	0.00	9600.00	study_abroad	1	2026-04-15 10:51:48.033409	\N	f	ELICOS 24 Weeks	\N	\N	1	f	\N	0	f	Active	2026-04-15 10:51:48.033409	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
97a07673-238c-4a0c-a2ee-297889b19af0	bbbb0001-0000-0000-0000-000000000001	Homestay 24 Weeks	Single room homestay with meals	1	7200.00	0.00	7200.00	accommodation	2	2026-04-15 10:51:48.033409	\N	f	Homestay 24 Weeks	\N	\N	1	f	\N	0	f	Active	2026-04-15 10:51:48.033409	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
7190404d-96fa-4fff-ba94-a0a0f44dfaea	bbbb0002-0000-0000-0000-000000000002	University Pathway 12 Months	Academic English + Pathway program	1	14400.00	0.00	14400.00	study_abroad	1	2026-04-15 10:51:48.033409	\N	f	University Pathway 12 Months	\N	\N	1	f	\N	0	f	Active	2026-04-15 10:51:48.033409	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
3872ea8b-21f2-401e-a8e2-6ea63fe8c757	bbbb0002-0000-0000-0000-000000000002	Student Accommodation	On-campus accommodation 12 months	1	12000.00	0.00	12000.00	accommodation	2	2026-04-15 10:51:48.033409	\N	f	Student Accommodation	\N	\N	1	f	\N	0	f	Active	2026-04-15 10:51:48.033409	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
37a140a6-fc9f-43ab-a8d3-fe0d5da9dffd	bbbb0002-0000-0000-0000-000000000002	Airport Pickup	One-way airport pickup	1	120.00	0.00	120.00	pickup	3	2026-04-15 10:51:48.033409	\N	f	Airport Pickup	\N	\N	1	f	\N	0	f	Active	2026-04-15 10:51:48.033409	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
0edd4f29-9e57-4833-987f-e1dbe14da90a	bbbb0003-0000-0000-0000-000000000003	ELICOS 12 Weeks	Intensive English Course	1	4800.00	0.00	4800.00	study_abroad	1	2026-04-15 10:51:48.033409	\N	f	ELICOS 12 Weeks	\N	\N	1	f	\N	0	f	Active	2026-04-15 10:51:48.033409	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
70900199-84e6-4618-af95-1204fe14fb8f	bbbb0003-0000-0000-0000-000000000003	Homestay 12 Weeks	Homestay with full board	1	3600.00	0.00	3600.00	accommodation	2	2026-04-15 10:51:48.033409	\N	f	Homestay 12 Weeks	\N	\N	1	f	\N	0	f	Active	2026-04-15 10:51:48.033409	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
369b52c4-01ef-4f46-9541-d2fe2a71bdfc	bbbb0003-0000-0000-0000-000000000003	Airport Pickup	Return airport transfer	1	220.00	0.00	220.00	pickup	3	2026-04-15 10:51:48.033409	\N	f	Airport Pickup	\N	\N	1	f	\N	0	f	Active	2026-04-15 10:51:48.033409	\N	a1b2c3d4-e5f6-7890-abcd-ef1234567890
\.


ALTER TABLE myagency.quote_products ENABLE TRIGGER ALL;

--
-- Data for Name: quotes; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.quotes DISABLE TRIGGER ALL;

COPY myagency.quotes (id, quote_ref_number, lead_id, contact_id, quote_status, created_by, created_on, modified_on, account_name, expiry_date, is_template, notes, customer_name, customer_contact_id, student_account_id, owner_id, camp_application_id, original_name, agent_account_id, organisation_id) FROM stdin;
bbbb0001-0000-0000-0000-000000000001	QT-2026-001	aaaa0001-0000-0000-0000-000000000001	\N	Revised	\N	2026-03-21 10:51:48.001502	2026-04-15 10:51:48.001502	Kim Ji-won	2026-06-30	f	ELICOS + Accommodation package	Kim Ji-won	\N	1605af17-a158-4315-827c-472d33656a5f	\N	\N	\N	b78f9499-7371-437d-b5ff-c294f557d13e	a1b2c3d4-e5f6-7890-abcd-ef1234567890
bbbb0002-0000-0000-0000-000000000002	QT-2026-002	aaaa0002-0000-0000-0000-000000000002	\N	Revised	\N	2026-04-03 10:51:48.001502	2026-04-15 10:51:48.001502	Park Seo-jun	2026-07-15	f	University pathway program	Park Seo-jun	\N	1605af17-a158-4315-827c-472d33656a5f	\N	\N	\N	b78f9499-7371-437d-b5ff-c294f557d13e	a1b2c3d4-e5f6-7890-abcd-ef1234567890
bbbb0003-0000-0000-0000-000000000003	QT-2026-003	aaaa0003-0000-0000-0000-000000000003	\N	Accepted	\N	2026-04-10 10:51:48.001502	2026-04-15 10:51:48.001502	Lee Min-ji	2026-08-01	f	Full package: study + accommodation + pickup	Lee Min-ji	\N	1605af17-a158-4315-827c-472d33656a5f	\N	\N	\N	b78f9499-7371-437d-b5ff-c294f557d13e	a1b2c3d4-e5f6-7890-abcd-ef1234567890
\.


ALTER TABLE myagency.quotes ENABLE TRIGGER ALL;

--
-- Data for Name: receipts; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.receipts DISABLE TRIGGER ALL;

COPY myagency.receipts (id, receipt_number, invoice_id, payer_id, amount, original_currency, original_amount, aud_equivalent, exchange_rate_to_aud, currency, payment_method, receipt_date, status, notes, created_at, ledger_entry_id, finance_item_id, confirmed_by, confirmed_at, organisation_id) FROM stdin;
\.


ALTER TABLE myagency.receipts ENABLE TRIGGER ALL;

--
-- Data for Name: report_sections; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.report_sections DISABLE TRIGGER ALL;

COPY myagency.report_sections (id, report_id, section_type, section_title, display_order, is_visible, content, created_at, updated_at) FROM stdin;
\.


ALTER TABLE myagency.report_sections ENABLE TRIGGER ALL;

--
-- Data for Name: settlement_checklist_templates; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.settlement_checklist_templates DISABLE TRIGGER ALL;

COPY myagency.settlement_checklist_templates (id, name, description, items, is_default, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE myagency.settlement_checklist_templates ENABLE TRIGGER ALL;

--
-- Data for Name: settlement_mgt; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.settlement_mgt DISABLE TRIGGER ALL;

COPY myagency.settlement_mgt (id, contract_id, product_id, provider_user_id, provider_role, service_description, gross_amount, commission_rate, commission_amount, net_amount, currency, original_currency, original_net_amount, aud_equivalent, exchange_rate_to_aud, status, settlement_date, notes, created_at, updated_at, ledger_entry_id, student_account_id, assigned_consultant_id, arrival_date, overall_status, checklist, checklist_template_id, is_active, provider_account_id) FROM stdin;
\.


ALTER TABLE myagency.settlement_mgt ENABLE TRIGGER ALL;

--
-- Data for Name: staff_kpi_periods; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.staff_kpi_periods DISABLE TRIGGER ALL;

COPY myagency.staff_kpi_periods (id, staff_id, period_type, period_start, period_end, lead_count, conversion_count, conversion_rate, attributed_revenue, payment_processed_count, visa_granted_count, incentive_rate, incentive_amount, bonus_tier, status, approved_by, approved_at, paid_at, notes, created_on, modified_on, ar_scheduled, ar_collected, ar_overdue, ap_scheduled, ap_paid, net_revenue, target_amount, excess_amount, incentive_type, incentive_fixed, incentive_tier) FROM stdin;
\.


ALTER TABLE myagency.staff_kpi_periods ENABLE TRIGGER ALL;

--
-- Data for Name: study_abroad_mgt; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.study_abroad_mgt DISABLE TRIGGER ALL;

COPY myagency.study_abroad_mgt (id, contract_id, lead_id, student_account_id, assigned_staff_id, application_stage, target_schools, coe_number, coe_expiry_date, coe_document_id, visa_type, visa_application_date, visa_decision_date, visa_expiry_date, visa_granted, visa_document_id, departure_date, orientation_completed, status, notes, created_at, updated_at, program_context, institute_account_id, program_name, program_type, program_start_date, program_end_date, weekly_hours, class_size_max, age_group, level_assessment_required, level_assessment_date, assigned_class, partner_cost, student_first_name, student_last_name, student_english_name, student_original_name, student_date_of_birth, student_gender, student_nationality, student_passport_number, student_passport_expiry, student_grade, student_school_name, is_active, spoken_language, program_duration, school_status, weekly_fee, enrolment_fee, regi_fee, material_fee, tuition_fee, school_commission, application_link, app_file_name) FROM stdin;
125e387e-97a0-48a7-9793-60467df387b5	e5cf9530-24d2-435d-8b2b-9f70bf75d7ab	\N	\N	\N	school_selection	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	\N	2026-04-11 11:05:30.340029	2026-04-11 11:05:30.340029	study_abroad	\N	Short Study	\N	2026-08-10	2026-08-21	\N	\N	\N	f	\N	\N	\N	Lok Yee Rachel	PANG	Rachel	\N	2015-07-28	female	Chinese	\N	\N	Grade 5	Oakleigh Grammar	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	https://docs.google.com/document/d/1cgkWW3Vo7Jlqr8U3ZCiSZ5tNkKI4SbXb_Zdgp-Jz3TE/edit	PANG_Lok Yee Rachel-Application Oakleigh Grammar-2026/04/09
ae9f3af4-c66e-48b6-a6ef-8986c496ff09	e5cf9530-24d2-435d-8b2b-9f70bf75d7ab	\N	\N	\N	school_selection	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	\N	2026-04-11 11:05:34.176654	2026-04-11 11:05:34.176654	study_abroad	\N	Short Study	\N	2026-08-10	2026-08-21	\N	\N	\N	f	\N	\N	\N	Lok Yung Valerie	PANG	Valerie	\N	2014-04-04	female	Chinese	\N	\N	Grade 6	Oakleigh Grammar	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	https://docs.google.com/document/d/1ZwQGPcSUUM9T6GthxfvNMqHQIp7zx4y9Z2a3ngRD_aE/edit	PANG_Lok Yung Valerie-Application Oakleigh Grammar-2026/04/09
577d200b-eb66-4dd4-abe8-3a250e08456c	27a7de5a-55cc-420f-bbb3-d39a985828a9	\N	\N	\N	school_selection	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	\N	2026-04-11 11:05:37.867685	2026-04-11 11:05:37.867685	study_abroad	\N	Short Study	\N	2026-08-10	2026-08-21	\N	\N	\N	f	\N	\N	\N	Yoonho	JUN	Anthony Jun	\N	2019-11-28	male	South Korea	M537R4998	\N	Grade 1	Oakleigh Grammar	t	korean	\N	\N	\N	\N	\N	\N	\N	\N	https://docs.google.com/document/d/1XGVIV9I096fREf96nFunF0_I0vXkMzhk1Q4MFudk9NU/edit	JUN_Yoonho-Application Oakleigh Grammar-2026/04/09
50971f7e-0a37-4ad8-8bf9-ae3523711f88	d440f5c0-aa75-4c7b-afab-673a3168f07e	\N	\N	\N	school_selection	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	\N	2026-04-11 11:05:41.723989	2026-04-11 11:05:41.723989	study_abroad	\N	Short Study	\N	2026-08-10	2026-08-21	\N	\N	\N	f	\N	\N	\N	Jimin	LEE	Grace	\N	2015-12-05	female	Korea	M94787881	\N	Grade 5	Oakleigh Grammar	t	Korean, English	\N	\N	\N	\N	\N	\N	\N	\N	https://docs.google.com/document/d/18-R1NfIK3hfogtAJkEhWL8eEJnQG0EwKIrtRXH_82E4/edit	LEE_Jimin-Application Oakleigh Grammar-2026/04/09
0ea7720e-e9e8-425f-9250-8bde25ec9186	bfc32694-5d78-4a94-aebb-87902d57154d	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	콜링우드로 진행 시도중	2026-04-11 11:05:45.676512	2026-04-11 11:05:45.676512	study_abroad	\N	Short Study	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	SIYUN	PARK	\N	\N	2019-05-27	male	Korean	M286A9309	\N	Grade 1	Oakleigh Grammar	t	Korean	15 Days	Applied School	\N	\N	\N	\N	\N	\N	https://docs.google.com/document/d/1xgXUGjflPeCmN4_naUnb6WAl1P_TpJnBkIaRDlzWsEw/edit	PARK_SIYUN-Application Oakleigh Grammar-2026/04/09
0a9f6b15-cc83-4ce0-97e9-7872faf22541	bfc32694-5d78-4a94-aebb-87902d57154d	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	콜링우드로 진행 시도중	2026-04-11 11:05:49.433597	2026-04-11 11:05:49.433597	study_abroad	\N	Short Study	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	DAMYUN	PARK	\N	\N	2017-08-06	female	Korean	M653G5689	\N	Grade 3	Oakleigh Grammar	t	\N	15 Days	Applied School	\N	\N	\N	\N	\N	\N	https://docs.google.com/document/d/1uuNcMQNWIq4qAk_aciLFV-_N5wha5KXgfbs4WtgPwWc/edit	PARK_DAMYUN-Application Oakleigh Grammar-2026/04/09
9d55bb99-ea86-40f1-a4cc-b3c0f38af2db	a80eef58-2a15-4a7d-8566-69fd824d2313	\N	\N	\N	school_selection	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	\N	2026-04-11 11:05:53.269269	2026-04-11 11:05:53.269269	study_abroad	\N	Short-term Schooling	\N	2026-08-03	2026-08-21	\N	\N	\N	f	\N	\N	\N	Hayul	Jung	\N	\N	2014-09-12	male	South Korea	\N	\N	Grade 6	The Cathedral School	t	\N	3 Weeks	\N	\N	\N	\N	\N	\N	\N	\N	Jung_Hayul-Application The Cathedral School-2026/04/01
6dce6420-721e-4e30-806f-34886f3f5a77	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	\N	\N	school_selection	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	다음 진행으로 보류	2026-04-11 11:05:57.104059	2026-04-11 11:05:57.104059	study_abroad	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	Eunho	LIU	Lucy	\N	2018-11-16	female	South Korea	\N	\N	Grade 1	Collingwood College	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	LIU_Eunho-Application Collingwood College-2026/04/09
cc14e424-b31b-41a8-98a7-0c3dd032b390	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	\N	\N	school_selection	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	다음 진행으로 보류	2026-04-11 11:06:00.792945	2026-04-11 11:06:00.792945	study_abroad	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	Youngho	LIU	Leo	\N	2016-01-27	male	South Korea	\N	\N	Grade 3	Collingwood College	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	LIU_Youngho-Application Collingwood College-2026/04/09
21d8090b-53f8-4f06-8370-d0657599bcec	c1ed920a-cf61-4015-a0ba-bfc7fd25d2cd	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	OAM 폼 작성	2026-04-11 11:06:05.047097	2026-04-11 11:06:05.047097	study_abroad	\N	Short-term Schooling	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Noah	LIM	Noah	\N	2017-02-01	male	Korean	M11805707	\N	Grade 3	Collingwood College	t	Korean/ English	3 Weeks	Applied School	\N	\N	\N	\N	\N	\N	\N	LIM_Noah-Application Collingwood College-2026/04/09
e6842cbc-03fe-4df3-a10f-d5342b05b7e1	c1ed920a-cf61-4015-a0ba-bfc7fd25d2cd	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	OAM 폼 작성	2026-04-11 11:06:08.794608	2026-04-11 11:06:08.794608	study_abroad	\N	Short-term Schooling	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Leah	LIM	Leah	\N	2014-03-21	female	Korean	M04989713	\N	Grade 6	Collingwood College	t	Korean/English	3 Weeks	Applied School	\N	\N	\N	\N	\N	\N	\N	LIM_Leah-Application Collingwood College-2026/04/09
d83bee76-b526-4348-9308-f68d07ad74ba	461c6292-fb62-41f1-840a-d8dcb94a2a89	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	OAM 폼 작성	2026-04-11 11:06:12.823289	2026-04-11 11:06:12.823289	study_abroad	\N	Short-term Schooling	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Min Jeong	SA	사민정	\N	2016-06-24	female	KOREA	M081B3912	\N	Grade 4	Collingwood College	t	KOREAN	3 Weeks	Applied School	\N	\N	\N	\N	\N	\N	\N	SA_Min Jeong-Application Collingwood College-2026/04/09
8df1bbd5-3bd8-42e8-b6bc-cb4747823dd4	3cda3dcc-2c4b-46fb-90b4-4836227db98c	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	\N	2026-04-11 11:06:16.733293	2026-04-11 11:06:16.733293	study_abroad	\N	Primary School Preparation Course (PSP)	\N	2026-07-27	2026-08-14	\N	\N	\N	f	\N	\N	\N	Soyul	KANG	Estella	\N	2015-02-10	female	Republic of Korea	M927Y1868	\N	Grade 5	BROWNS English Language School	t	Korean	3	Applied School	\N	\N	\N	\N	\N	\N	https://docs.google.com/document/d/1gyJQ2vkQw-3KH2EYxPvbFhsZGYyS_oH7tZGUwsCVNDc/edit	KANG_Soyul-Application BROWNS English Language School-2026/03/19
73409796-d6c2-4b43-ab5b-dcb7239d07ea	20b6c86c-3c39-48be-a9ed-fcce5ab702c6	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	Invitation letter발급 완료	2026-04-11 11:06:20.483031	2026-04-11 11:06:20.483031	study_abroad	\N	Short Study	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Ain	SONG	Ain	\N	2017-07-24	female	South Korea	\N	\N	Grade 3	Oakleigh Grammar	t	\N	15 Days	Applied School	\N	\N	\N	\N	\N	\N	\N	SONG_Ain-Application Oakleigh Grammar-2026/04/09
57404962-4406-46e6-a043-2361273f887c	a93da133-21f8-4958-8cd5-9993048fb1b8	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	Invitation letter발급 완료	2026-04-11 11:06:24.556377	2026-04-11 11:06:24.556377	study_abroad	\N	Short Study	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Sehyun	PARK	Samuel	\N	2018-01-10	male	South Korea	\N	\N	Grade 2	Oakleigh Grammar	t	\N	15 Days	Applied School	\N	\N	\N	\N	\N	\N	\N	PARK_Sehyun-Application Oakleigh Grammar-2026/04/09
ae263829-2f90-4893-8230-827096dd23c5	a3e30696-0225-483e-a287-752aeeb9a200	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	내년 2월로 연기요청	2026-04-11 11:06:28.41492	2026-04-11 11:06:28.41492	study_abroad	\N	Short-term Schooling	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Suho	YOO	Kai	\N	2018-03-03	male	South Korea	\N	\N	Grade 2	Collingwood College	t	\N	3 Weeks	Applied School	\N	\N	\N	\N	\N	\N	\N	YOO_Suho-Application Collingwood College-2026/04/09
b026d853-0c65-4037-bae3-d724c26964a4	eed783de-f7e2-4c03-8329-4499ccc5d534	\N	\N	\N	school_selection	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	cancelled	\N	2026-04-11 11:06:32.229391	2026-04-11 11:06:32.229391	study_abroad	\N	Short-term Schooling	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Soyul	KANG	Estella	\N	2015-02-10	female	South Korea	\N	\N	Grade 5	Collingwood College	t	\N	3 Weeks	Cancelled	\N	\N	\N	\N	\N	\N	\N	KANG_Soyul-Application Collingwood College-2026/03/06
fe7dd6b5-e349-4683-831b-a1c9324059e0	ee54ee4c-5adf-4a40-acda-403c1bfced50	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	Invitation letter발급 완료	2026-04-11 11:06:35.892671	2026-04-11 11:06:35.892671	study_abroad	\N	Short Study	\N	2026-07-20	2026-08-28	\N	\N	\N	f	\N	\N	\N	Seoyoon	CHUNG	Seoyoon	\N	2014-10-29	female	South Korea	\N	\N	Grade 6	Oakleigh Grammar	t	\N	30 Days	Applied School	\N	\N	\N	\N	\N	\N	\N	CHUNG_Seoyoon-Application Oakleigh Grammar-2026/04/09
48858c1f-f72c-46a2-9a66-d2a7776ac168	c2cf71a6-8877-40f1-8685-16c7fd32e805	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	OAM 폼 작성	2026-04-11 11:06:39.723097	2026-04-11 11:06:39.723097	study_abroad	\N	Short-term Schooling	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Jeongyeon	KIM	Jenny	\N	2018-02-03	female	South Korea	\N	\N	Grade 1	Collingwood College	t	\N	3 Weeks	Applied School	\N	\N	\N	\N	\N	\N	\N	KIM_Jeongyeon-Application Collingwood College-2026/04/09
cabbac49-a89f-41dc-81cf-39a82e66e106	af574d96-22a4-40ac-80e6-38eb769abcc9	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	Invitation letter발급 완료	2026-04-11 11:06:50.900244	2026-04-11 11:06:50.900244	study_abroad	\N	Short Study	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Layoon	JEONG	Yunee	\N	2018-01-21	female	South Korea	\N	\N	Grade 1	Oakleigh Grammar	t	\N	15 Days	Applied School	\N	\N	\N	\N	\N	\N	\N	JEONG_Layoon-Application Oakleigh Grammar-2026/04/09
b0eec052-e6c0-484f-b7b7-7f8eed6e59d8	6d77ec2e-2080-422e-a36f-3235fc1b20db	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	Invitation letter발급 완료	2026-04-11 11:06:54.563494	2026-04-11 11:06:54.563494	study_abroad	\N	Short Study	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Woojoo	LIM	Woojoo	\N	2016-02-04	male	South Korea	\N	\N	Grade 3	Oakleigh Grammar	t	\N	15 Days	Applied School	\N	\N	\N	\N	\N	\N	\N	LIM_Woojoo-Application Oakleigh Grammar-2026/04/09
63fef803-01f6-4d08-888a-ee76c1b2223c	6d77ec2e-2080-422e-a36f-3235fc1b20db	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	Invitation letter발급 완료	2026-04-11 11:06:58.422371	2026-04-11 11:06:58.422371	study_abroad	\N	Short Study	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Ajeong	LIM	Ajeong	\N	2013-08-15	female	South Korea	\N	\N	Grade 6	Oakleigh Grammar	t	\N	15 Days	Applied School	\N	\N	\N	\N	\N	\N	\N	LIM_Ajeong-Application Oakleigh Grammar-2026/04/09
f40f9f41-2a58-4283-bb86-3dbd212f8c75	a82d9619-f105-405d-a1c7-5d51c4b1dcfc	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	OAM 폼 작성	2026-04-11 11:07:02.219655	2026-04-11 11:07:02.219655	study_abroad	\N	Short-term Schooling	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Jihwan	LEE	Leo	\N	2016-05-28	male	South Korea	\N	\N	Grade 3	Collingwood College	t	\N	3 Weeks	Applied School	\N	\N	\N	\N	\N	\N	\N	LEE_Jihwan-Application Collingwood College-2026/04/09
c2f0aaa1-5a68-4854-a60e-92ead0a8e73a	3c7871d3-6722-446b-bcc6-39722b7e443d	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	Invitation letter발급 완료	2026-04-11 11:07:06.014202	2026-04-11 11:07:06.014202	study_abroad	\N	Short Study	\N	2026-06-12	2026-08-07	\N	\N	\N	f	\N	\N	\N	Moongun	LEE	Moongun	\N	2015-04-25	male	South Korea	\N	\N	Grade 4	Oakleigh Grammar	t	\N	30 Days	Applied School	\N	\N	\N	\N	\N	\N	\N	LEE_Moongun-Application Oakleigh Grammar-2026/04/09
16e899ce-409d-408d-989b-213e10f2fc4e	3c7871d3-6722-446b-bcc6-39722b7e443d	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	Invitation letter발급 완료	2026-04-11 11:07:09.847616	2026-04-11 11:07:09.847616	study_abroad	\N	Short Study	\N	2026-06-12	2026-08-07	\N	\N	\N	f	\N	\N	\N	Sihyun	LEE	Sihyun	\N	2013-02-16	female	South Korea	\N	\N	Grade 6	Oakleigh Grammar	t	\N	30 Days	Applied School	\N	\N	\N	\N	\N	\N	\N	LEE_Sihyun-Application Oakleigh Grammar-2026/04/09
ff5c7fcf-8c64-4326-9100-b344391dd6c4	d76bea55-68fa-4a62-a537-a94a16902391	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	OAM Form 작성	2026-04-11 11:07:13.731949	2026-04-11 11:07:13.731949	study_abroad	\N	Short-term Schooling	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Younchan	LEE	Chan	\N	2018-12-14	male	South Korea	\N	\N	Grade 2	Collingwood College	t	\N	3 Weeks	Applied School	\N	\N	\N	\N	\N	\N	\N	LEE_Younchan-Application Collingwood College-2026/04/07
1868a029-6883-43f6-b1d9-71d42ea2943f	d76bea55-68fa-4a62-a537-a94a16902391	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	OAM form 작성	2026-04-11 11:07:17.481959	2026-04-11 11:07:17.481959	study_abroad	\N	Short-term Schooling	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Sihun	LEE	Sean	\N	2016-03-04	male	South Korea	\N	\N	Grade 4	Collingwood College	t	\N	3 Weeks	Applied School	\N	\N	\N	\N	\N	\N	\N	LEE_Sihun-Application Collingwood College-2026/04/07
15fe5e53-4d19-47a3-89f8-2303da38347e	d76bea55-68fa-4a62-a537-a94a16902391	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	OAM 폼 작성	2026-04-11 11:07:21.330784	2026-04-11 11:07:21.330784	study_abroad	\N	Short-term Schooling	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Yubin	KIM	Yubin	\N	2015-07-12	male	South Korea	\N	\N	Grade 5	Collingwood College	t	\N	3 Weeks	Applied School	\N	\N	\N	\N	\N	\N	\N	KIM_Yubin-Application Collingwood College-2026/04/07
a980f2c4-5eab-4480-9867-4ba2de033b88	a89cbc95-af8a-42b5-b5af-7dcc28e764c6	\N	\N	\N	application	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	active	OAM 폼 작성	2026-04-11 11:07:25.122016	2026-04-11 11:07:25.122016	study_abroad	\N	Short-term Schooling	\N	2026-07-20	2026-08-07	\N	\N	\N	f	\N	\N	\N	Yul	LEE	Leo	\N	2018-07-04	male	South Korea	\N	\N	Grade 2	Collingwood College	t	\N	3 Weeks	Applied School	\N	\N	\N	\N	\N	\N	\N	LEE_Yul-Application Collingwood College-2026/04/09
\.


ALTER TABLE myagency.study_abroad_mgt ENABLE TRIGGER ALL;

--
-- Data for Name: task_attachments; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.task_attachments DISABLE TRIGGER ALL;

COPY myagency.task_attachments (id, task_id, file_path, file_name, file_type, uploaded_by, created_at) FROM stdin;
\.


ALTER TABLE myagency.task_attachments ENABLE TRIGGER ALL;

--
-- Data for Name: task_comments; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.task_comments DISABLE TRIGGER ALL;

COPY myagency.task_comments (id, task_id, author_id, author_name, content, is_internal, created_at) FROM stdin;
\.


ALTER TABLE myagency.task_comments ENABLE TRIGGER ALL;

--
-- Data for Name: tasks; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.tasks DISABLE TRIGGER ALL;

COPY myagency.tasks (id, assigned_to, contract_id, task_title, description, priority, status, due_date, created_at, updated_at, task_number, task_type, category, source, submitted_by, submitted_name, submitted_email, submitted_phone, assigned_team, application_id, related_service_type, title, visibility, first_response_at, resolved_at, sla_breached, satisfaction_rating, satisfaction_comment, rated_at, organisation_id, is_deleted, deleted_at, deleted_by) FROM stdin;
13d11f08-a129-4498-935f-68b3a31a54b0	1c3b5b5d-1c4f-4cb0-b941-7c9051dfb833	\N	\N	tewst	normal	open	\N	2026-04-19 11:12:43.810956	2026-04-19 11:12:43.810956	TSK-2026-9425	internal	request	portal	30063c30-90e9-40d4-9b07-420065659873	\N	\N	\N	\N	\N	\N	test	internal	\N	\N	f	\N	\N	\N	\N	f	\N	\N
\.


ALTER TABLE myagency.tasks ENABLE TRIGGER ALL;

--
-- Data for Name: tax_invoices; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.tax_invoices DISABLE TRIGGER ALL;

COPY myagency.tax_invoices (id, invoice_ref, invoice_date, invoice_type, contract_product_id, contract_id, school_account_id, student_account_id, program_name, student_name, course_start_date, course_end_date, commission_amount, gst_amount, total_amount, is_gst_free, payment_header_id, pdf_url, sent_at, sent_to_email, status, due_date, paid_at, created_by, created_on, modified_on) FROM stdin;
\.


ALTER TABLE myagency.tax_invoices ENABLE TRIGGER ALL;

--
-- Data for Name: tax_rates; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.tax_rates DISABLE TRIGGER ALL;

COPY myagency.tax_rates (id, name, rate, description, status, created_on, modified_on) FROM stdin;
\.


ALTER TABLE myagency.tax_rates ENABLE TRIGGER ALL;

--
-- Data for Name: team_kpi_periods; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.team_kpi_periods DISABLE TRIGGER ALL;

COPY myagency.team_kpi_periods (id, team_id, period_type, period_start, period_end, member_count, lead_count, conversion_count, conversion_rate, payment_processed_count, visa_granted_count, ar_scheduled, ar_collected, ar_overdue, ap_scheduled, ap_paid, net_revenue, target_amount, excess_amount, incentive_type, incentive_rate, incentive_fixed, incentive_amount, status, approved_by, approved_at, paid_at, notes, created_on, modified_on) FROM stdin;
\.


ALTER TABLE myagency.team_kpi_periods ENABLE TRIGGER ALL;

--
-- Data for Name: teams; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.teams DISABLE TRIGGER ALL;

COPY myagency.teams (id, name, description, type, color, team_lead_id, status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE myagency.teams ENABLE TRIGGER ALL;

--
-- Data for Name: tour_mgt; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.tour_mgt DISABLE TRIGGER ALL;

COPY myagency.tour_mgt (id, contract_id, tour_company_id, tour_name, tour_date, start_time, end_time, meeting_point, highlights, guide_info, tour_notes, status, created_at, updated_at, ledger_entry_id, product_id, service_fee, ap_cost, tour_type, child_fee, adult_fee, child_no, adult_no, payment_date, meal, meal_fee, tour_no, is_active) FROM stdin;
1e06dfee-5c42-47e9-8b8e-a18ca2018ce2	a89cbc95-af8a-42b5-b5af-7dcc28e764c6	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
dba22518-65eb-47f5-a05c-dbbed93667d5	a89cbc95-af8a-42b5-b5af-7dcc28e764c6	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
68366a16-fed4-44cb-a548-758d870ab88d	d76bea55-68fa-4a62-a537-a94a16902391	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	3	1	\N	\N	\N	4	t
e5b7913a-6cc2-4b4f-b4f8-f69a60cd8c45	d76bea55-68fa-4a62-a537-a94a16902391	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	3	1	\N	\N	\N	4	t
93a08961-c481-4855-8871-c337c4a80747	a82d9619-f105-405d-a1c7-5d51c4b1dcfc	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
5413315f-0a6f-475a-ade2-ff06ab9e6878	a82d9619-f105-405d-a1c7-5d51c4b1dcfc	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
fb303725-0060-4bee-bdc6-64ab2c3ede38	6d77ec2e-2080-422e-a36f-3235fc1b20db	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	1384 Dandenong Rd, Hughesdale	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	2	1	\N	\N	\N	3	t
84eb44b6-54b1-48aa-8779-053c2a361409	6d77ec2e-2080-422e-a36f-3235fc1b20db	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	1384 Dandenong Rd, Hughesdale	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	2	1	\N	\N	\N	3	t
6e67a18f-22dc-4722-8056-99282a954bc4	af574d96-22a4-40ac-80e6-38eb769abcc9	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	1384 Dandenong Rd, Hughesdale	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
2446d5ac-114e-403d-8cc5-96aa1b938200	af574d96-22a4-40ac-80e6-38eb769abcc9	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	1384 Dandenong Rd, Hughesdale	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
a804d6fa-d6fa-47f8-9a95-6c983900f0b5	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	2	1	\N	\N	\N	3	t
5848c9e5-e4a8-4437-80c0-6c0255aa9abb	c2cf71a6-8877-40f1-8685-16c7fd32e805	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
b16ffa78-fcc0-4828-af36-f751489a127b	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	2	1	\N	\N	\N	3	t
770b9eb4-5330-4e1e-b41c-ebd1c9db5875	c2cf71a6-8877-40f1-8685-16c7fd32e805	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
114c78ca-9de0-4dba-b697-19c520a1589e	ee54ee4c-5adf-4a40-acda-403c1bfced50	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	1384 Dandenong Rd, Hughesdale	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
c77067a5-bf6c-43b8-97a7-75a4f2a880ed	ee54ee4c-5adf-4a40-acda-403c1bfced50	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	1384 Dandenong Rd, Hughesdale	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
839230f9-df0e-4ea3-940d-1d9477615ec0	a3e30696-0225-483e-a287-752aeeb9a200	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
debdb57a-a2d4-4657-8494-6a79299ecf8c	a3e30696-0225-483e-a287-752aeeb9a200	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
86110088-997d-424f-9951-c2a864a592b2	a93da133-21f8-4958-8cd5-9993048fb1b8	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	1384 Dandenong Rd, Hughesdale	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
f6a2e175-0605-4cbb-b69a-19aaab320a41	a93da133-21f8-4958-8cd5-9993048fb1b8	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	1384 Dandenong Rd, Hughesdale	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
90ed11ea-8526-47f3-827e-f50840b63292	20b6c86c-3c39-48be-a9ed-fcce5ab702c6	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	1384 Dandenong Rd, Hughesdale	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
a2ac44ca-c0c6-47c2-aa6f-c6cc40da010a	20b6c86c-3c39-48be-a9ed-fcce5ab702c6	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	1384 Dandenong Rd, Hughesdale	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
994c1396-ae1d-4181-a6c2-046265277802	461c6292-fb62-41f1-840a-d8dcb94a2a89	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
ea66c9e9-3a69-401c-a798-b99beda7c744	461c6292-fb62-41f1-840a-d8dcb94a2a89	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
c4f20c1d-d522-4e20-8b4c-3745502cf26f	c1ed920a-cf61-4015-a0ba-bfc7fd25d2cd	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	2	1	\N	\N	\N	3	t
136babd7-63ee-4731-a324-1090b2acba9b	c1ed920a-cf61-4015-a0ba-bfc7fd25d2cd	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	2	1	\N	\N	\N	3	t
4af6fd00-6279-49ca-8b43-dbcdf3d2891e	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	2	1	\N	\N	\N	3	t
a843279c-c8bf-4944-864f-14e2bd598e64	a701b69d-7dc0-43c1-bb76-e02c60e598da	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	388 Lonsdale St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	2	1	\N	\N	\N	3	t
144c46df-6ab9-49f9-98ea-501d1ad7ae1a	bfc32694-5d78-4a94-aebb-87902d57154d	\N	Great Ocean Road	2026-07-25	07:00 AM	07:30 PM	1384 Dandenong Rd, Hughesdale	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	2	1	\N	\N	\N	3	t
f0d9dfc6-a299-4a8b-b700-af87c1b2c9f4	bfc32694-5d78-4a94-aebb-87902d57154d	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	1384 Dandenong Rd, Hughesdale	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	2	1	\N	\N	\N	3	t
1103c1e2-1bc2-45d6-999d-97d53250035c	3cda3dcc-2c4b-46fb-90b4-4836227db98c	\N	Great Ocean Road	2026-08-08	07:00 AM	07:30 PM	550 Flinders St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	그룹투어	\N	\N	1	1	\N	\N	\N	2	t
bcfa9f07-aa42-462f-8870-d5b28020e01c	3cda3dcc-2c4b-46fb-90b4-4836227db98c	\N	Puffing Billy and Phillip Island	2026-08-01	10:00 AM	10:00 PM	550 Flinders St, Melbourne	\N	\N	\N	processing	2026-04-12 05:06:06.015104	2026-04-12 05:27:18.830131	\N	\N	\N	\N	차터투어	\N	\N	1	1	\N	\N	\N	2	t
\.


ALTER TABLE myagency.tour_mgt ENABLE TRIGGER ALL;

--
-- Data for Name: transactions; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.transactions DISABLE TRIGGER ALL;

COPY myagency.transactions (id, contract_id, invoice_id, bank_account_id, transaction_type, amount, original_currency, original_amount, aud_equivalent, exchange_rate_to_aud, currency, description, bank_reference, transaction_date, created_by, created_at, ledger_entry_id, account_id, contact_id, payment_info_id, cost_center_code, credit_amount, status, organisation_id) FROM stdin;
\.


ALTER TABLE myagency.transactions ENABLE TRIGGER ALL;

--
-- Data for Name: user_ledger; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.user_ledger DISABLE TRIGGER ALL;

COPY myagency.user_ledger (id, contract_id, finance_item_id, user_id, entry_type, cost_center, amount, currency, description, reference_type, reference_id, transaction_date, status, created_by, created_at) FROM stdin;
\.


ALTER TABLE myagency.user_ledger ENABLE TRIGGER ALL;

--
-- Data for Name: visa_services_mgt; Type: TABLE DATA; Schema: myagency; Owner: -
--

ALTER TABLE myagency.visa_services_mgt DISABLE TRIGGER ALL;

COPY myagency.visa_services_mgt (id, contract_id, assigned_staff_id, partner_id, visa_type, country, application_date, appointment_date, submission_date, decision_date, visa_number, start_date, end_date, status, service_fee, ap_cost, notes, created_at, updated_at, is_active) FROM stdin;
\.


ALTER TABLE myagency.visa_services_mgt ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--

\unrestrict 8wExganzImUN1NGv9Lg5j73m3mxE6CfG9CbwgVvd34nINHcu10ont0FBdRCtVOg

