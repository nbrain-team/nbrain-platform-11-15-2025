--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3
-- Dumped by pg_dump version 16.3

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

DROP DATABASE IF EXISTS render_dpg_d38t51ruibrs73a3c3m0_a;
--
-- Name: render_dpg_d38t51ruibrs73a3c3m0_a; Type: DATABASE; Schema: -; Owner: -
--

CREATE DATABASE render_dpg_d38t51ruibrs73a3c3m0_a WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF-8';


\connect render_dpg_d38t51ruibrs73a3c3m0_a

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: advisor_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.advisor_clients (
    advisor_id integer NOT NULL,
    client_id integer NOT NULL,
    assigned_at timestamp with time zone DEFAULT now()
);


--
-- Name: advisor_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.advisor_requests (
    id integer NOT NULL,
    client_id integer NOT NULL,
    message text NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: advisor_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.advisor_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: advisor_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.advisor_requests_id_seq OWNED BY public.advisor_requests.id;


--
-- Name: agent_ideas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_ideas (
    id integer NOT NULL,
    user_id integer,
    project_id integer,
    title text NOT NULL,
    problem_statement text,
    target_audience text,
    success_metrics text,
    user_workflow text,
    key_capabilities text,
    technical_stack text,
    integration_touchpoints text,
    future_enhancements text,
    status character varying(50) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_roadmap_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_roadmap_configs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_roadmap_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_roadmap_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_roadmap_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_roadmap_configs_id_seq OWNED BY public.ai_roadmap_configs.id;


--
-- Name: credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credentials (
    id integer NOT NULL,
    user_id integer NOT NULL,
    service character varying(100) NOT NULL,
    key character varying(255) NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.credentials_id_seq OWNED BY public.credentials.id;


--
-- Name: email_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_outbox (
    id integer NOT NULL,
    to_user_id integer,
    to_email character varying(255) NOT NULL,
    subject text NOT NULL,
    body_html text NOT NULL,
    template_id integer,
    template_data jsonb,
    status character varying(50) DEFAULT 'pending'::character varying,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone
);


--
-- Name: email_outbox_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_outbox_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_outbox_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_outbox_id_seq OWNED BY public.email_outbox.id;


--
-- Name: email_sequence_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_sequence_steps (
    id integer NOT NULL,
    sequence_id integer NOT NULL,
    step_number integer NOT NULL,
    delay_hours integer NOT NULL,
    template_id integer,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_sequence_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_sequence_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_sequence_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_sequence_steps_id_seq OWNED BY public.email_sequence_steps.id;


--
-- Name: email_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_sequences (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    trigger_event character varying(100),
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_sequences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_sequences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_sequences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_sequences_id_seq OWNED BY public.email_sequences.id;


--
-- Name: email_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_settings (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_settings_id_seq OWNED BY public.email_settings.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    subject text NOT NULL,
    body_html text NOT NULL,
    variables jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    token character varying(255) NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_credentials (
    id integer NOT NULL,
    project_id integer NOT NULL,
    credential_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_credentials_id_seq OWNED BY public.project_credentials.id;


--
-- Name: project_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_files (
    id integer NOT NULL,
    project_id integer NOT NULL,
    filename character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_type character varying(50),
    user_id integer,
    uploaded_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_files_id_seq OWNED BY public.project_files.id;


--
-- Name: project_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_messages (
    id integer NOT NULL,
    project_id integer NOT NULL,
    user_id integer,
    sender_name character varying(255),
    message text NOT NULL,
    timestamp timestamp with time zone DEFAULT now()
);


--
-- Name: project_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_messages_id_seq OWNED BY public.project_messages.id;


--
-- Name: project_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_proposals (
    id integer NOT NULL,
    project_id integer NOT NULL,
    scope_summary text,
    timeline_estimate character varying(255),
    cost_estimate character varying(255),
    deliverables text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_proposals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_proposals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_proposals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_proposals_id_seq OWNED BY public.project_proposals.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'Submitted'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    chat_history jsonb DEFAULT '[]'::jsonb
);


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: roadmap_departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_departments (
    id integer NOT NULL,
    roadmap_config_id integer NOT NULL,
    name character varying(255) NOT NULL,
    color character varying(50),
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: roadmap_departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_departments_id_seq OWNED BY public.roadmap_departments.id;


--
-- Name: roadmap_edges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_edges (
    id integer NOT NULL,
    roadmap_config_id integer NOT NULL,
    source_node_id integer NOT NULL,
    target_node_id integer NOT NULL,
    edge_type character varying(50) DEFAULT 'default'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: roadmap_edges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_edges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_edges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_edges_id_seq OWNED BY public.roadmap_edges.id;


--
-- Name: roadmap_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_nodes (
    id integer NOT NULL,
    roadmap_config_id integer NOT NULL,
    node_type character varying(50) NOT NULL,
    parent_node_id integer,
    idea_id bigint,
    project_id integer,
    position_x double precision NOT NULL,
    position_y double precision NOT NULL,
    width double precision DEFAULT 250.0,
    height double precision DEFAULT 120.0,
    label character varying(500),
    description text,
    status character varying(50) DEFAULT 'ideation'::character varying,
    priority character varying(50) DEFAULT 'medium'::character varying,
    start_date date,
    end_date date,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    department_id integer,
    category character varying(255),
    is_category boolean DEFAULT false
);


--
-- Name: roadmap_nodes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_nodes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_nodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_nodes_id_seq OWNED BY public.roadmap_nodes.id;


--
-- Name: roadmap_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_snapshots (
    id integer NOT NULL,
    roadmap_config_id integer NOT NULL,
    snapshot_data jsonb NOT NULL,
    created_by integer,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: roadmap_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_snapshots_id_seq OWNED BY public.roadmap_snapshots.id;


--
-- Name: schedule_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_requests (
    id integer NOT NULL,
    client_id integer NOT NULL,
    advisor_id integer,
    time_slot character varying(255) NOT NULL,
    meeting_description text,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: schedule_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schedule_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schedule_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schedule_requests_id_seq OWNED BY public.schedule_requests.id;


--
-- Name: stage_change_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stage_change_approvals (
    id integer NOT NULL,
    project_id integer NOT NULL,
    advisor_id integer NOT NULL,
    from_stage character varying(100) NOT NULL,
    to_stage character varying(100) NOT NULL,
    message text,
    attachment_file_id integer,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone
);


--
-- Name: stage_change_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stage_change_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stage_change_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stage_change_approvals_id_seq OWNED BY public.stage_change_approvals.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    role character varying(50) NOT NULL,
    name character varying(255),
    email character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    company_name character varying(255),
    website_url character varying(500),
    phone character varying(50)
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: webinar_signups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webinar_signups (
    id integer NOT NULL,
    webinar_id integer NOT NULL,
    client_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: webinar_signups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webinar_signups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webinar_signups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webinar_signups_id_seq OWNED BY public.webinar_signups.id;


--
-- Name: webinars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webinars (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    datetime character varying(100),
    duration character varying(50),
    image_url character varying(500),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: webinars_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webinars_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webinars_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webinars_id_seq OWNED BY public.webinars.id;


--
-- Name: advisor_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_requests ALTER COLUMN id SET DEFAULT nextval('public.advisor_requests_id_seq'::regclass);


--
-- Name: ai_roadmap_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_roadmap_configs ALTER COLUMN id SET DEFAULT nextval('public.ai_roadmap_configs_id_seq'::regclass);


--
-- Name: credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credentials ALTER COLUMN id SET DEFAULT nextval('public.credentials_id_seq'::regclass);


--
-- Name: email_outbox id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_outbox ALTER COLUMN id SET DEFAULT nextval('public.email_outbox_id_seq'::regclass);


--
-- Name: email_sequence_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_sequence_steps ALTER COLUMN id SET DEFAULT nextval('public.email_sequence_steps_id_seq'::regclass);


--
-- Name: email_sequences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_sequences ALTER COLUMN id SET DEFAULT nextval('public.email_sequences_id_seq'::regclass);


--
-- Name: email_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_settings ALTER COLUMN id SET DEFAULT nextval('public.email_settings_id_seq'::regclass);


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: project_credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_credentials ALTER COLUMN id SET DEFAULT nextval('public.project_credentials_id_seq'::regclass);


--
-- Name: project_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_files ALTER COLUMN id SET DEFAULT nextval('public.project_files_id_seq'::regclass);


--
-- Name: project_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_messages ALTER COLUMN id SET DEFAULT nextval('public.project_messages_id_seq'::regclass);


--
-- Name: project_proposals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_proposals ALTER COLUMN id SET DEFAULT nextval('public.project_proposals_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: roadmap_departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_departments ALTER COLUMN id SET DEFAULT nextval('public.roadmap_departments_id_seq'::regclass);


--
-- Name: roadmap_edges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_edges ALTER COLUMN id SET DEFAULT nextval('public.roadmap_edges_id_seq'::regclass);


--
-- Name: roadmap_nodes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_nodes ALTER COLUMN id SET DEFAULT nextval('public.roadmap_nodes_id_seq'::regclass);


--
-- Name: roadmap_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_snapshots ALTER COLUMN id SET DEFAULT nextval('public.roadmap_snapshots_id_seq'::regclass);


--
-- Name: schedule_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_requests ALTER COLUMN id SET DEFAULT nextval('public.schedule_requests_id_seq'::regclass);


--
-- Name: stage_change_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_change_approvals ALTER COLUMN id SET DEFAULT nextval('public.stage_change_approvals_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: webinar_signups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webinar_signups ALTER COLUMN id SET DEFAULT nextval('public.webinar_signups_id_seq'::regclass);


--
-- Name: webinars id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webinars ALTER COLUMN id SET DEFAULT nextval('public.webinars_id_seq'::regclass);


--
-- Data for Name: advisor_clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.advisor_clients (advisor_id, client_id, assigned_at) FROM stdin;
4	3	2025-09-23 21:26:05.479663+00
4	5	2025-09-23 21:52:39.226486+00
4	9	2025-09-24 22:41:48.754018+00
4	10	2025-09-30 16:12:25.903088+00
4	14	2025-10-11 21:40:30.742968+00
4	15	2025-10-11 21:50:30.696806+00
4	16	2025-10-13 22:41:35.685467+00
4	17	2025-10-15 16:44:07.804668+00
\.


--
-- Data for Name: advisor_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.advisor_requests (id, client_id, message, status, created_at) FROM stdin;
\.


--
-- Data for Name: agent_ideas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agent_ideas (id, user_id, project_id, title, problem_statement, target_audience, success_metrics, user_workflow, key_capabilities, technical_stack, integration_touchpoints, future_enhancements, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ai_roadmap_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_roadmap_configs (id, user_id, name, description, settings, created_at, updated_at) FROM stdin;
1	4	My AI Ecosystem	Strategic AI implementation roadmap	{}	2025-10-14 22:54:23.713419	2025-10-14 22:54:23.713419
2	16	My AI Ecosystem	Strategic AI implementation roadmap	{}	2025-10-15 16:10:24.532124	2025-10-15 16:10:24.532124
3	17	My AI Ecosystem	Strategic AI implementation roadmap	{}	2025-10-15 16:47:34.776866	2025-10-15 16:47:34.776866
\.


--
-- Data for Name: credentials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credentials (id, user_id, service, key, value, created_at) FROM stdin;
\.


--
-- Data for Name: email_outbox; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_outbox (id, to_user_id, to_email, subject, body_html, template_id, template_data, status, error_message, created_at, sent_at) FROM stdin;
\.


--
-- Data for Name: email_sequence_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_sequence_steps (id, sequence_id, step_number, delay_hours, template_id, status, created_at) FROM stdin;
\.


--
-- Data for Name: email_sequences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_sequences (id, name, description, trigger_event, status, created_at) FROM stdin;
\.


--
-- Data for Name: email_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_settings (id, key, value, updated_at) FROM stdin;
1	smtp_host	smtp.gmail.com	2025-09-23 21:13:50.882136+00
2	smtp_port	587	2025-09-23 21:13:50.882136+00
3	smtp_secure	false	2025-09-23 21:13:50.882136+00
4	smtp_user		2025-09-23 21:13:50.882136+00
5	smtp_pass		2025-09-23 21:13:50.882136+00
6	from_email	info@xsourcing.com	2025-09-23 21:13:50.882136+00
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_templates (id, key, name, subject, body_html, variables, created_at, updated_at) FROM stdin;
1	welcome_client	Welcome Email - Client	Welcome to X-Sourcing	<html><body><h1>Welcome {{clientName}}!</h1><p>We're excited to have you onboard.</p></body></html>	["clientName"]	2025-09-23 21:13:50.893298+00	2025-09-23 21:13:50.893298+00
2	advisor_assigned	Advisor Assigned	Your Advisor Has Been Assigned	<html><body><h1>Hi {{clientName}},</h1><p>Your advisor {{advisorName}} has been assigned.</p></body></html>	["clientName", "advisorName"]	2025-09-23 21:13:50.893298+00	2025-09-23 21:13:50.893298+00
3	proposal_ready	Proposal Ready	Your Project Proposal is Ready	<html><body><h1>Hi {{clientName}},</h1><p>Your proposal for {{projectTitle}} is ready for review.</p></body></html>	["clientName", "projectTitle"]	2025-09-23 21:13:50.893298+00	2025-09-23 21:13:50.893298+00
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (token, user_id, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: project_credentials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_credentials (id, project_id, credential_id, created_at) FROM stdin;
\.


--
-- Data for Name: project_files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_files (id, project_id, filename, file_path, file_type, user_id, uploaded_at) FROM stdin;
\.


--
-- Data for Name: project_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_messages (id, project_id, user_id, sender_name, message, timestamp) FROM stdin;
\.


--
-- Data for Name: project_proposals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_proposals (id, project_id, scope_summary, timeline_estimate, cost_estimate, deliverables, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, client_id, title, description, status, created_at, updated_at, chat_history) FROM stdin;
\.


--
-- Data for Name: roadmap_departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_departments (id, roadmap_config_id, name, color, display_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: roadmap_edges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_edges (id, roadmap_config_id, source_node_id, target_node_id, edge_type, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: roadmap_nodes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_nodes (id, roadmap_config_id, node_type, parent_node_id, idea_id, project_id, position_x, position_y, width, height, label, description, status, priority, start_date, end_date, metadata, created_at, updated_at, department_id, category, is_category) FROM stdin;
29	1	idea	\N	1759168394116	\N	1126.00	1276.00	250.00	120.00	Leasing Lido: AI Marketing Agent for Multi-Property Management	Leasing Lido is a specialized AI agent designed for multi-property marketing teams to automate and optimize their Google Business Profile (GBP) listings. By intelligently managing reviews, posting real-time vacancy updates, and analyzing performance, the agent aims to enhance online reputation, drive qualified leads, and ultimately reduce vacancy rates across a portfolio of up to 20 apartment complexes.	ideation	medium	\N	\N	{}	2025-10-14 22:54:23.726874	2025-10-15 16:09:46.046993	\N	\N	f
28	1	idea	\N	1759083751483	\N	807.41	1373.18	250.00	120.00	Realtor AdPilot: AI-Powered Facebook Campaign Manager	Realtor AdPilot is an AI agent that automates Facebook marketing for real estate professionals. It transforms their organic page posts into optimized 'Reach' and 'Clicks' ad campaigns, manages budgets, and provides clear analytics, enabling realtors to scale their marketing efforts and maximize return on investment.	ideation	medium	\N	\N	{}	2025-10-14 22:54:23.725891	2025-10-15 16:09:54.470856	\N	\N	f
30	1	idea	\N	1759187695186	\N	944.00	1392.00	250.00	120.00	SignAI: AI-Enhanced Secure Document Workflow Platform	SignAI is a secure, in-house e-signature platform designed to replace services like DocuSign. It automates the entire document signing workflow, from template management to legally-binding signature collection and audit trail generation, providing a streamlined and auditable process for your team.	ideation	medium	\N	\N	{}	2025-10-14 22:54:23.728116	2025-10-15 16:09:53.699775	\N	\N	f
31	1	idea	\N	1759187695286	\N	732.00	1588.00	250.00	120.00	KABEE: The Knowledge Base Auto-Extractor & Engine	KABEE is an autonomous AI agent that automates the creation and maintenance of a corporate knowledge base. It connects to company data sources like Slack, documents, and tickets, intelligently extracts question-answer pairs and processes, and serves this knowledge through a conversational interface, eliminating repetitive questions and centralizing information.	ideation	medium	\N	\N	{}	2025-10-14 22:54:23.729111	2025-10-15 16:09:55.728586	\N	\N	f
32	1	idea	\N	1759187695357	\N	720.00	1570.00	250.00	120.00	AI Marketing Content Repurposing Engine	This agent acts as a force multiplier for marketing teams by ingesting a single piece of core content (like a blog, webinar, or whitepaper) and autonomously generating a full suite of high-quality, channel-specific assets. It automates the creative process, adapts content for optimal engagement on each platform, and integrates with scheduling tools to streamline the entire content lifecycle.	ideation	medium	\N	\N	{}	2025-10-14 22:54:23.730105	2025-10-15 16:09:56.487414	\N	\N	f
33	1	idea	\N	1759259342869	\N	778.00	1466.00	250.00	120.00	Aria: The AI Sustainable Gardening Content Creator	Aria is a sophisticated AI agent designed to automate the entire content lifecycle for a sustainable gardening blog. It handles everything from SEO-driven topic ideation and in-depth research to writing, image sourcing, and direct publishing, enabling you to consistently produce 10 high-quality articles per month with minimal effort.	ideation	medium	\N	\N	{}	2025-10-14 22:54:23.731052	2025-10-15 16:09:57.462431	\N	\N	f
34	1	idea	\N	1759423564469	\N	790.00	1583.07	250.00	120.00	Client Insights and Reporting Agent	The Client Insights and Reporting Agent streamlines the process of aggregating marketing data, generating actionable insights, and creating client reports. It reduces internal costs, improves client retention, and offers clients a clear understanding of their marketing performance.	ideation	medium	\N	\N	{}	2025-10-14 22:54:23.732016	2025-10-15 16:09:59.066365	\N	\N	f
44	2	category	\N	\N	\N	759.35	84.01	250.00	120.00	HR	HR AI initiatives	planned	medium	\N	\N	{}	2025-10-15 16:10:24.540441	2025-10-15 16:34:43.624499	\N	HR	t
46	2	category	\N	\N	\N	766.15	486.50	250.00	120.00	Finance	Finance AI initiatives	planned	medium	\N	\N	{}	2025-10-15 16:10:24.544189	2025-10-15 16:17:30.483693	\N	Finance	t
47	2	category	\N	\N	\N	761.26	654.95	250.00	120.00	Other	Other AI initiatives	planned	medium	\N	\N	{}	2025-10-15 16:10:24.546089	2025-10-15 16:17:29.235958	\N	Other	t
42	2	category	\N	\N	\N	762.71	-242.94	250.00	120.00	Sales	Sales AI initiatives	planned	medium	\N	\N	{}	2025-10-15 16:10:24.537172	2025-10-15 16:31:16.912473	\N	Sales	t
45	2	category	\N	\N	\N	754.17	248.00	250.00	120.00	Operations	Operations AI initiatives	planned	medium	\N	\N	{}	2025-10-15 16:10:24.542383	2025-10-15 16:34:45.946226	\N	Operations	t
43	2	category	\N	\N	\N	760.83	-81.74	250.00	120.00	Marketing	Marketing AI initiatives	planned	medium	\N	\N	{}	2025-10-15 16:10:24.538647	2025-10-15 16:34:40.922452	\N	Marketing	t
41	2	category	\N	\N	\N	99.31	151.32	250.00	120.00	The Brain	Central AI strategy hub	planned	medium	\N	\N	{}	2025-10-15 16:10:24.534501	2025-10-15 16:30:13.425754	\N	The Brain	t
61	3	category	\N	\N	\N	841.02	284.40	250.00	120.00	Finance	Finance AI initiatives	planned	medium	\N	\N	{}	2025-10-15 16:47:34.784384	2025-10-15 17:41:46.684146	\N	Finance	t
53	2	idea	\N	1760397491673	\N	1171.20	479.79	250.00	120.00	AI Marketing Content Repurposing Engine	This agent acts as a force multiplier for marketing teams by ingesting a single piece of core content (like a blog, webinar, or whitepaper) and autonomously generating a full suite of high-quality, channel-specific assets. It automates the creative process, adapts content for optimal engagement on each platform, and integrates with scheduling tools to streamline the entire content lifecycle.	ideation	medium	\N	\N	{}	2025-10-15 16:10:24.558078	2025-10-15 16:18:21.818846	\N	\N	f
52	2	idea	\N	1760397491441	\N	1182.75	163.64	250.00	120.00	Intelligent Data Integrity Agent (IDIA)	IDIA is an autonomous AI agent that automates the entire data quality lifecycle for enterprise systems. It connects to CRMs, ERPs, and spreadsheets to continuously audit, clean, deduplicate, and enrich records, ensuring data-driven decisions are based on a foundation of accurate and complete information.	ideation	medium	\N	\N	{}	2025-10-15 16:10:24.556223	2025-10-15 16:19:34.573504	\N	\N	f
55	2	project	\N	\N	\N	1352.27	297.38	250.00	120.00	Marketing Automation		planned	medium	\N	\N	{}	2025-10-15 16:20:06.582927	2025-10-15 16:22:35.322846	\N	\N	f
51	2	idea	\N	1760397491195	\N	1178.88	-200.22	250.00	120.00	LexiQ: AI-Powered Case Knowledge Base	LexiQ is an AI agent that transforms a law firm's historical case files into a secure, searchable knowledge base. It streamlines legal research by allowing lawyers to ask natural language questions and receive synthesized answers with direct citations, instantly surfacing precedents and strategic insights from the firm's own work.	ideation	medium	\N	\N	{}	2025-10-15 16:10:24.554675	2025-10-15 16:26:47.772907	\N	\N	f
54	2	idea	\N	1760397491935	\N	1118.37	-15.57	250.00	120.00	Cognitive IP Watchdog: Proactive Infringement Detection & Response Agent	The Cognitive IP Watchdog is an autonomous AI agent designed for legal professionals to proactively monitor global IP databases, detect potential infringements, and accelerate legal responses. It automates the laborious process of manual searching and analysis, providing prioritized alerts and drafting initial legal actions to protect client assets.	ideation	medium	\N	\N	{}	2025-10-15 16:10:24.559623	2025-10-15 16:27:19.75661	\N	\N	f
50	2	idea	\N	1760397120712	\N	1113.11	344.01	250.00	120.00	AI-Powered Customer Success & Product Insights Agent	An advanced AI agent designed to deliver instant, accurate customer support across multiple channels. It not only resolves user queries by integrating with knowledge bases and internal tools but also proactively analyzes support trends to provide actionable insights for product improvement, significantly reducing ticket volume and enhancing user satisfaction.	ideation	medium	\N	\N	{}	2025-10-15 16:10:24.552969	2025-10-15 16:21:02.004968	\N	\N	f
56	3	category	\N	\N	\N	576.22	266.69	250.00	120.00	The Brain	Central AI strategy hub	planned	medium	\N	\N	{}	2025-10-15 16:47:34.778268	2025-10-15 17:41:46.679023	\N	The Brain	t
57	3	category	\N	\N	\N	319.53	115.74	250.00	120.00	Sales	Sales AI initiatives	planned	medium	\N	\N	{}	2025-10-15 16:47:34.779773	2025-10-15 17:41:46.680289	\N	Sales	t
58	3	category	\N	\N	\N	326.18	294.09	250.00	120.00	Marketing	Marketing AI initiatives	planned	medium	\N	\N	{}	2025-10-15 16:47:34.781022	2025-10-15 17:41:46.681403	\N	Marketing	t
59	3	category	\N	\N	\N	327.91	455.90	250.00	120.00	HR	HR AI initiatives	planned	medium	\N	\N	{}	2025-10-15 16:47:34.782111	2025-10-15 17:41:46.682337	\N	HR	t
60	3	category	\N	\N	\N	837.52	117.85	250.00	120.00	Operations	Operations AI initiatives	planned	medium	\N	\N	{}	2025-10-15 16:47:34.783242	2025-10-15 17:41:46.683256	\N	Operations	t
66	3	project	\N	\N	\N	-190.69	-128.37	250.00	120.00	AI-Powered Prospect Find/Append	This project leverages an AI-driven engine to proactively identify high-potential sales prospects that align with our Ideal Customer Profile (ICP). Simultaneously, the system will automatically append and enrich existing contact records with missing data points, ensuring our CRM remains accurate and valuable. By automating lead generation and data hygiene, this initiative will accelerate pipeline growth, boost sales productivity, and improve the effectiveness of our go-to-market campaigns.	planned	medium	\N	\N	{}	2025-10-15 17:41:29.644073	2025-10-15 17:41:46.687764	\N	\N	f
62	3	category	\N	\N	\N	842.60	446.60	250.00	120.00	Other	Other AI initiatives	planned	medium	\N	\N	{}	2025-10-15 16:47:34.785398	2025-10-15 17:41:46.685084	\N	Other	t
64	3	project	\N	\N	\N	-144.31	269.79	250.00	120.00	Opticwise Smart Chat Agent	The Opticwise Smart Chat Agent is a next-generation conversational AI designed to revolutionize our customer interaction model. Leveraging advanced natural language processing, the agent provides instant, personalized support and automates complex query resolution 24/7. This strategic initiative will significantly enhance customer satisfaction, drive operational efficiency by reducing support costs, and unlock valuable insights from user interactions to inform business decisions.	planned	medium	\N	\N	{}	2025-10-15 17:07:29.36615	2025-10-15 17:41:46.685955	\N	\N	f
65	3	project	\N	\N	\N	-307.08	55.04	250.00	120.00	1-2-1 Personalized Outbound Automation Platform	The 1-2-1 Personalized Outbound Automation Platform is an advanced AI system designed to revolutionize enterprise sales and marketing outreach. Leveraging generative AI, the platform analyzes individual prospect data to autonomously craft and send hyper-personalized messages at an unprecedented scale. This innovation moves beyond generic templates to dramatically increase engagement rates, accelerate sales pipeline generation, and unlock significant team productivity. By enabling truly personal communication at scale, the platform provides a critical competitive advantage in a crowded market.	planned	medium	\N	\N	{}	2025-10-15 17:36:28.133056	2025-10-15 17:41:46.686828	\N	\N	f
\.


--
-- Data for Name: roadmap_snapshots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_snapshots (id, roadmap_config_id, snapshot_data, created_by, notes, created_at) FROM stdin;
\.


--
-- Data for Name: schedule_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schedule_requests (id, client_id, advisor_id, time_slot, meeting_description, status, created_at) FROM stdin;
2	3	4	Tue, Oct 7 · 10:00–10:45 AM PT	Webinar signup: Live Scope Clinic: Define Your First AI Project	pending	2025-09-25 00:57:57.914318+00
\.


--
-- Data for Name: stage_change_approvals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stage_change_approvals (id, project_id, advisor_id, from_stage, to_stage, message, attachment_file_id, status, created_at, approved_at, rejected_at) FROM stdin;
1	42	4	Discovery	UX/UI	Moved to UX	15	pending	2025-10-14 17:14:14.523351+00	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, role, name, email, username, password, company_name, website_url, phone) FROM stdin;
5	client	danny demichele	danny@pureboost.com	pureboost	$2b$10$uU5v3HBkiDNfaGQkACYuh.QbufdfYPer/wJ2/V2iyCO0HZ2lX6H1O	Pureboost	https://www.pureboost.com	760-494-0404
3	client	ACME ASSETS, Inc.	client@example.com	acme	$2b$10$cugvkGd2lQId0DCDaSrOKur9AIeDXPPSv56.gU8qLcwhWVPq/akE.	\N	\N	\N
4	advisor	Danny Demichele	danny@nbrain.ai	dannydemichele	$2b$10$phy4E8WZHH7UkHoip7lYhezPCeQTfCtMfWNh0Edh35QQnGNQGDOR.	\N	\N	7604940404
9	client	Michael Johnson	michael@associates.com	michael	$2b$10$eSODIJRPCjimDgicAMVEKOjB42dqKTQoP/TTCywGJW.hdOALf6dQK	Michael & Associates	https://associates.com	760-484-0808
10	client	Andrew Reed	andrew.reed@appetite4opportunitiy.com	andrewreed	$2b$10$.zYTauXjGADfCXQXDCFIHOVuB7CAvOZ9swJvCYTBrtxek1cECwYIe	appetite4opportunitiy.com	appetite4opportunitiy.com	888-888-8888
1	admin	Admin User	admin@example.com	admin	admin	\N	\N	\N
2	advisor	Advisor User	advisor@example.com	advisor	advisor	\N	\N	\N
14	client	Rav	Rav@blockcity.fi	BlockCity	$2b$10$5RjDq2miE186IshzCNBtE.zbhtAP5JdjHu1cJXnP8fzFUB9dc5vpq	BlockCity	https://x.com/BlockCityFi	\N
15	client	danny demichele	danny@ddd.com	dannyd	$2b$10$79TYyRc8BmkWUlMtyixp6uHjtwjZpL2/AFsjFlsO0nTgs3Bbhd8kO	dannyd	\N	\N
16	client	Cary Johnson	cary@nbrain.ai	caryjohnson	$2b$10$7oUOeDsk2Q0Plb/W6pgaKeKT/HCwiJa.XRTiV9kuAMc1h2QSWNolS	Cary Consulting	\N	\N
17	client	Bill Douglas	bill@opticw.com	billdouglas	$2b$10$ry.XpsnhrkDRMdMob4l4F.rJxEVvkmh5WOWp1mqQmptnU.b1wLWv6	OpticWise	https://www.opticwise.com	\N
\.


--
-- Data for Name: webinar_signups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.webinar_signups (id, webinar_id, client_id, created_at) FROM stdin;
1	2	3	2025-09-25 20:31:31.211302+00
2	1	3	2025-09-25 20:31:41.849823+00
5	1	16	2025-10-13 23:06:45.348592+00
\.


--
-- Data for Name: webinars; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.webinars (id, title, description, datetime, duration, image_url, created_at) FROM stdin;
1	Live Scope Clinic: Define Your First AI Project	In this live working session, we walk through the exact scoping playbook we use to transform a raw idea into a shippable AI project. We will cover success criteria, guardrails, data considerations, and an MVP slice you can build next week. Bring a real idea—there will be live Q&A and examples from recent launches.	Sun Sep 28, 8:25 PM UTC	45 min	https://images.unsplash.com/photo-1551836022-4c4c79ecde51?auto=format&fit=crop&w=1600&q=80	2025-09-25 20:25:32.226786+00
2	RAG Patterns That Actually Ship	We break down retrieval-augmented generation (RAG) patterns that consistently make it to production. Learn how to choose chunking, embedding, and indexing strategies, when to rerank, how to evaluate responses, and what to log for observability. Includes concrete architectures you can replicate.	Thu Oct 2, 8:25 PM UTC	40 min	https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1600&q=80	2025-09-25 20:25:32.226786+00
3	Ops Automation: 5 Workflows That Print Time	See the five automation workflows we deploy most often to save teams hours per week: reporting, enrichment, ticket triage, QA, and handoffs. We will show before/after swimlanes, failure handling, and how to keep humans-in-the-loop without slowing throughput. Real examples and templates included.	Tue Oct 7, 8:25 PM UTC	40 min	https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?auto=format&fit=crop&w=1600&q=80	2025-09-25 20:25:32.226786+00
\.


--
-- Name: advisor_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.advisor_requests_id_seq', 1, false);


--
-- Name: ai_roadmap_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_roadmap_configs_id_seq', 3, true);


--
-- Name: credentials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.credentials_id_seq', 34, true);


--
-- Name: email_outbox_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_outbox_id_seq', 46, true);


--
-- Name: email_sequence_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_sequence_steps_id_seq', 1, false);


--
-- Name: email_sequences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_sequences_id_seq', 1, false);


--
-- Name: email_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_settings_id_seq', 6, true);


--
-- Name: email_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_templates_id_seq', 3, true);


--
-- Name: project_credentials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_credentials_id_seq', 1, true);


--
-- Name: project_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_files_id_seq', 15, true);


--
-- Name: project_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_messages_id_seq', 32, true);


--
-- Name: project_proposals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_proposals_id_seq', 13, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.projects_id_seq', 42, true);


--
-- Name: roadmap_departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_departments_id_seq', 1, false);


--
-- Name: roadmap_edges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_edges_id_seq', 40, true);


--
-- Name: roadmap_nodes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_nodes_id_seq', 66, true);


--
-- Name: roadmap_snapshots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_snapshots_id_seq', 1, false);


--
-- Name: schedule_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.schedule_requests_id_seq', 8, true);


--
-- Name: stage_change_approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stage_change_approvals_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 17, true);


--
-- Name: webinar_signups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.webinar_signups_id_seq', 5, true);


--
-- Name: webinars_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.webinars_id_seq', 3, true);


--
-- Name: advisor_clients advisor_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_clients
    ADD CONSTRAINT advisor_clients_pkey PRIMARY KEY (advisor_id, client_id);


--
-- Name: advisor_requests advisor_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_requests
    ADD CONSTRAINT advisor_requests_pkey PRIMARY KEY (id);


--
-- Name: agent_ideas agent_ideas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_ideas
    ADD CONSTRAINT agent_ideas_pkey PRIMARY KEY (id);


--
-- Name: ai_roadmap_configs ai_roadmap_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_roadmap_configs
    ADD CONSTRAINT ai_roadmap_configs_pkey PRIMARY KEY (id);


--
-- Name: credentials credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credentials
    ADD CONSTRAINT credentials_pkey PRIMARY KEY (id);


--
-- Name: email_outbox email_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_outbox
    ADD CONSTRAINT email_outbox_pkey PRIMARY KEY (id);


--
-- Name: email_sequence_steps email_sequence_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_sequence_steps
    ADD CONSTRAINT email_sequence_steps_pkey PRIMARY KEY (id);


--
-- Name: email_sequences email_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_sequences
    ADD CONSTRAINT email_sequences_pkey PRIMARY KEY (id);


--
-- Name: email_settings email_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT email_settings_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_key_key UNIQUE (key);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (token);


--
-- Name: project_credentials project_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_credentials
    ADD CONSTRAINT project_credentials_pkey PRIMARY KEY (id);


--
-- Name: project_credentials project_credentials_project_id_credential_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_credentials
    ADD CONSTRAINT project_credentials_project_id_credential_id_key UNIQUE (project_id, credential_id);


--
-- Name: project_files project_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_files
    ADD CONSTRAINT project_files_pkey PRIMARY KEY (id);


--
-- Name: project_messages project_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_messages
    ADD CONSTRAINT project_messages_pkey PRIMARY KEY (id);


--
-- Name: project_proposals project_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_proposals
    ADD CONSTRAINT project_proposals_pkey PRIMARY KEY (id);


--
-- Name: project_proposals project_proposals_project_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_proposals
    ADD CONSTRAINT project_proposals_project_id_key UNIQUE (project_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: roadmap_departments roadmap_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_departments
    ADD CONSTRAINT roadmap_departments_pkey PRIMARY KEY (id);


--
-- Name: roadmap_edges roadmap_edges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_edges
    ADD CONSTRAINT roadmap_edges_pkey PRIMARY KEY (id);


--
-- Name: roadmap_nodes roadmap_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_nodes
    ADD CONSTRAINT roadmap_nodes_pkey PRIMARY KEY (id);


--
-- Name: roadmap_snapshots roadmap_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_snapshots
    ADD CONSTRAINT roadmap_snapshots_pkey PRIMARY KEY (id);


--
-- Name: schedule_requests schedule_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_requests
    ADD CONSTRAINT schedule_requests_pkey PRIMARY KEY (id);


--
-- Name: stage_change_approvals stage_change_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_change_approvals
    ADD CONSTRAINT stage_change_approvals_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: webinar_signups webinar_signups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webinar_signups
    ADD CONSTRAINT webinar_signups_pkey PRIMARY KEY (id);


--
-- Name: webinar_signups webinar_signups_webinar_id_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webinar_signups
    ADD CONSTRAINT webinar_signups_webinar_id_client_id_key UNIQUE (webinar_id, client_id);


--
-- Name: webinars webinars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webinars
    ADD CONSTRAINT webinars_pkey PRIMARY KEY (id);


--
-- Name: idx_credentials_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credentials_user_id ON public.credentials USING btree (user_id);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_roadmap_configs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_configs_user ON public.ai_roadmap_configs USING btree (user_id);


--
-- Name: idx_roadmap_departments_config; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_departments_config ON public.roadmap_departments USING btree (roadmap_config_id);


--
-- Name: idx_roadmap_edges_config; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_edges_config ON public.roadmap_edges USING btree (roadmap_config_id);


--
-- Name: idx_roadmap_edges_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_edges_source ON public.roadmap_edges USING btree (source_node_id);


--
-- Name: idx_roadmap_edges_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_edges_target ON public.roadmap_edges USING btree (target_node_id);


--
-- Name: idx_roadmap_nodes_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_nodes_category ON public.roadmap_nodes USING btree (category);


--
-- Name: idx_roadmap_nodes_config; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_nodes_config ON public.roadmap_nodes USING btree (roadmap_config_id);


--
-- Name: idx_roadmap_nodes_dept; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_nodes_dept ON public.roadmap_nodes USING btree (department_id);


--
-- Name: idx_roadmap_nodes_idea; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_nodes_idea ON public.roadmap_nodes USING btree (idea_id);


--
-- Name: idx_roadmap_nodes_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_nodes_parent ON public.roadmap_nodes USING btree (parent_node_id);


--
-- Name: idx_roadmap_nodes_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_nodes_project ON public.roadmap_nodes USING btree (project_id);


--
-- Name: idx_stage_approvals_project_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stage_approvals_project_status ON public.stage_change_approvals USING btree (project_id, status);


--
-- Name: advisor_clients advisor_clients_advisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_clients
    ADD CONSTRAINT advisor_clients_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: advisor_clients advisor_clients_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_clients
    ADD CONSTRAINT advisor_clients_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: agent_ideas agent_ideas_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_ideas
    ADD CONSTRAINT agent_ideas_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: agent_ideas agent_ideas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_ideas
    ADD CONSTRAINT agent_ideas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_roadmap_configs ai_roadmap_configs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_roadmap_configs
    ADD CONSTRAINT ai_roadmap_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: credentials credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credentials
    ADD CONSTRAINT credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: email_outbox email_outbox_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_outbox
    ADD CONSTRAINT email_outbox_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id) ON DELETE SET NULL;


--
-- Name: email_outbox email_outbox_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_outbox
    ADD CONSTRAINT email_outbox_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: email_sequence_steps email_sequence_steps_sequence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_sequence_steps
    ADD CONSTRAINT email_sequence_steps_sequence_id_fkey FOREIGN KEY (sequence_id) REFERENCES public.email_sequences(id) ON DELETE CASCADE;


--
-- Name: email_sequence_steps email_sequence_steps_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_sequence_steps
    ADD CONSTRAINT email_sequence_steps_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id) ON DELETE SET NULL;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: project_credentials project_credentials_credential_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_credentials
    ADD CONSTRAINT project_credentials_credential_id_fkey FOREIGN KEY (credential_id) REFERENCES public.credentials(id) ON DELETE CASCADE;


--
-- Name: project_credentials project_credentials_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_credentials
    ADD CONSTRAINT project_credentials_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_files project_files_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_files
    ADD CONSTRAINT project_files_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_files project_files_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_files
    ADD CONSTRAINT project_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: project_messages project_messages_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_messages
    ADD CONSTRAINT project_messages_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_messages project_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_messages
    ADD CONSTRAINT project_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: project_proposals project_proposals_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_proposals
    ADD CONSTRAINT project_proposals_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_departments roadmap_departments_roadmap_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_departments
    ADD CONSTRAINT roadmap_departments_roadmap_config_id_fkey FOREIGN KEY (roadmap_config_id) REFERENCES public.ai_roadmap_configs(id) ON DELETE CASCADE;


--
-- Name: roadmap_edges roadmap_edges_roadmap_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_edges
    ADD CONSTRAINT roadmap_edges_roadmap_config_id_fkey FOREIGN KEY (roadmap_config_id) REFERENCES public.ai_roadmap_configs(id) ON DELETE CASCADE;


--
-- Name: roadmap_edges roadmap_edges_source_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_edges
    ADD CONSTRAINT roadmap_edges_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES public.roadmap_nodes(id) ON DELETE CASCADE;


--
-- Name: roadmap_edges roadmap_edges_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_edges
    ADD CONSTRAINT roadmap_edges_target_node_id_fkey FOREIGN KEY (target_node_id) REFERENCES public.roadmap_nodes(id) ON DELETE CASCADE;


--
-- Name: roadmap_nodes roadmap_nodes_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_nodes
    ADD CONSTRAINT roadmap_nodes_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.roadmap_departments(id) ON DELETE SET NULL;


--
-- Name: roadmap_nodes roadmap_nodes_parent_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_nodes
    ADD CONSTRAINT roadmap_nodes_parent_node_id_fkey FOREIGN KEY (parent_node_id) REFERENCES public.roadmap_nodes(id) ON DELETE CASCADE;


--
-- Name: roadmap_nodes roadmap_nodes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_nodes
    ADD CONSTRAINT roadmap_nodes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: roadmap_nodes roadmap_nodes_roadmap_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_nodes
    ADD CONSTRAINT roadmap_nodes_roadmap_config_id_fkey FOREIGN KEY (roadmap_config_id) REFERENCES public.ai_roadmap_configs(id) ON DELETE CASCADE;


--
-- Name: roadmap_snapshots roadmap_snapshots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_snapshots
    ADD CONSTRAINT roadmap_snapshots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: roadmap_snapshots roadmap_snapshots_roadmap_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_snapshots
    ADD CONSTRAINT roadmap_snapshots_roadmap_config_id_fkey FOREIGN KEY (roadmap_config_id) REFERENCES public.ai_roadmap_configs(id) ON DELETE CASCADE;


--
-- Name: schedule_requests schedule_requests_advisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_requests
    ADD CONSTRAINT schedule_requests_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: schedule_requests schedule_requests_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_requests
    ADD CONSTRAINT schedule_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stage_change_approvals stage_change_approvals_advisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_change_approvals
    ADD CONSTRAINT stage_change_approvals_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stage_change_approvals stage_change_approvals_attachment_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_change_approvals
    ADD CONSTRAINT stage_change_approvals_attachment_file_id_fkey FOREIGN KEY (attachment_file_id) REFERENCES public.project_files(id) ON DELETE SET NULL;


--
-- Name: stage_change_approvals stage_change_approvals_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_change_approvals
    ADD CONSTRAINT stage_change_approvals_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: webinar_signups webinar_signups_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webinar_signups
    ADD CONSTRAINT webinar_signups_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: webinar_signups webinar_signups_webinar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webinar_signups
    ADD CONSTRAINT webinar_signups_webinar_id_fkey FOREIGN KEY (webinar_id) REFERENCES public.webinars(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

