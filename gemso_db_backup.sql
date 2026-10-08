--
-- PostgreSQL database dump
--

\restrict TtmRElZHnZRU9Kg1fb0UVHUpa5sT9ddBky2wOyib6ciJRJXSfQMIlNMTdwd2HK5

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

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
-- Name: anuncios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.anuncios (
    id_anu integer NOT NULL,
    titulo character varying(200) NOT NULL,
    contenido text NOT NULL,
    categoria character varying(50) NOT NULL,
    urgente boolean DEFAULT false,
    id_autor integer NOT NULL,
    id_dep_destino integer,
    id_usu_destino integer,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.anuncios OWNER TO postgres;

--
-- Name: anuncios_adj; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.anuncios_adj (
    id_anu_adj integer NOT NULL,
    id_anu integer,
    nombre_archivo character varying(255) NOT NULL,
    tipo_archivo character varying(50) NOT NULL,
    url_archivo text NOT NULL
);


ALTER TABLE public.anuncios_adj OWNER TO postgres;

--
-- Name: anuncios_adj_id_anu_adj_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.anuncios_adj_id_anu_adj_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.anuncios_adj_id_anu_adj_seq OWNER TO postgres;

--
-- Name: anuncios_adj_id_anu_adj_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.anuncios_adj_id_anu_adj_seq OWNED BY public.anuncios_adj.id_anu_adj;


--
-- Name: anuncios_id_anu_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.anuncios_id_anu_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.anuncios_id_anu_seq OWNER TO postgres;

--
-- Name: anuncios_id_anu_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.anuncios_id_anu_seq OWNED BY public.anuncios.id_anu;


--
-- Name: anuncios_leidos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.anuncios_leidos (
    id_anu_lei integer NOT NULL,
    id_usu integer,
    id_anu integer,
    fecha_leido timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.anuncios_leidos OWNER TO postgres;

--
-- Name: anuncios_leidos_id_anu_lei_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.anuncios_leidos_id_anu_lei_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.anuncios_leidos_id_anu_lei_seq OWNER TO postgres;

--
-- Name: anuncios_leidos_id_anu_lei_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.anuncios_leidos_id_anu_lei_seq OWNED BY public.anuncios_leidos.id_anu_lei;


--
-- Name: departamentos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departamentos (
    id_dep integer NOT NULL,
    nombre character varying(100) NOT NULL
);


ALTER TABLE public.departamentos OWNER TO postgres;

--
-- Name: departamentos_id_dep_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departamentos_id_dep_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departamentos_id_dep_seq OWNER TO postgres;

--
-- Name: departamentos_id_dep_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departamentos_id_dep_seq OWNED BY public.departamentos.id_dep;


--
-- Name: permisos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permisos (
    id_per integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text
);


ALTER TABLE public.permisos OWNER TO postgres;

--
-- Name: permisos_id_per_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permisos_id_per_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permisos_id_per_seq OWNER TO postgres;

--
-- Name: permisos_id_per_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permisos_id_per_seq OWNED BY public.permisos.id_per;


--
-- Name: usuario_permisos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario_permisos (
    id_usu_per integer NOT NULL,
    id_usu integer,
    id_per integer
);


ALTER TABLE public.usuario_permisos OWNER TO postgres;

--
-- Name: usuario_permisos_id_usu_per_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_permisos_id_usu_per_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_permisos_id_usu_per_seq OWNER TO postgres;

--
-- Name: usuario_permisos_id_usu_per_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_permisos_id_usu_per_seq OWNED BY public.usuario_permisos.id_usu_per;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id_usu integer NOT NULL,
    nombre_completo character varying(150) NOT NULL,
    fecha_nacimiento date NOT NULL,
    fecha_ingreso date NOT NULL,
    correo character varying(150) NOT NULL,
    "contraseña" character varying(255) NOT NULL,
    puesto character varying(100),
    id_departamento integer NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_usu_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_usu_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_usu_seq OWNER TO postgres;

--
-- Name: usuarios_id_usu_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_usu_seq OWNED BY public.usuarios.id_usu;


--
-- Name: anuncios id_anu; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios ALTER COLUMN id_anu SET DEFAULT nextval('public.anuncios_id_anu_seq'::regclass);


--
-- Name: anuncios_adj id_anu_adj; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios_adj ALTER COLUMN id_anu_adj SET DEFAULT nextval('public.anuncios_adj_id_anu_adj_seq'::regclass);


--
-- Name: anuncios_leidos id_anu_lei; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios_leidos ALTER COLUMN id_anu_lei SET DEFAULT nextval('public.anuncios_leidos_id_anu_lei_seq'::regclass);


--
-- Name: departamentos id_dep; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departamentos ALTER COLUMN id_dep SET DEFAULT nextval('public.departamentos_id_dep_seq'::regclass);


--
-- Name: permisos id_per; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permisos ALTER COLUMN id_per SET DEFAULT nextval('public.permisos_id_per_seq'::regclass);


--
-- Name: usuario_permisos id_usu_per; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_permisos ALTER COLUMN id_usu_per SET DEFAULT nextval('public.usuario_permisos_id_usu_per_seq'::regclass);


--
-- Name: usuarios id_usu; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id_usu SET DEFAULT nextval('public.usuarios_id_usu_seq'::regclass);


--
-- Data for Name: anuncios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.anuncios (id_anu, titulo, contenido, categoria, urgente, id_autor, id_dep_destino, id_usu_destino, fecha_creacion) FROM stdin;
1	¡Bienvenidos a la PWA de GEMSO!	Esta es la nueva plataforma interna de comunicación y anuncios de GEMSO.	Global	f	1	\N	\N	2026-10-04 18:51:18.015816
2	¡Bienvenidos a la PWA de GEMSO!	Plataforma interna de comunicación y avisos.	Global	f	1	\N	\N	2026-10-04 18:55:21.055685
\.


--
-- Data for Name: anuncios_adj; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.anuncios_adj (id_anu_adj, id_anu, nombre_archivo, tipo_archivo, url_archivo) FROM stdin;
\.


--
-- Data for Name: anuncios_leidos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.anuncios_leidos (id_anu_lei, id_usu, id_anu, fecha_leido) FROM stdin;
\.


--
-- Data for Name: departamentos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departamentos (id_dep, nombre) FROM stdin;
1	TI
2	Talento y Cultura
3	Ventas
4	Tecnologías de la Información
\.


--
-- Data for Name: permisos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permisos (id_per, nombre, descripcion) FROM stdin;
\.


--
-- Data for Name: usuario_permisos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario_permisos (id_usu_per, id_usu, id_per) FROM stdin;
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id_usu, nombre_completo, fecha_nacimiento, fecha_ingreso, correo, "contraseña", puesto, id_departamento, fecha_creacion) FROM stdin;
1	Francisco Alberto Salazar Figueroa	2004-04-12	2026-07-27	fsalazar@gemso.com.mx	aH@gMs#662	Practicante	1	2026-10-04 18:51:18.015816
2	Admin GEMSO	1995-05-15	2023-01-10	admin@gemso.com	123456	Administrador	1	2026-10-04 18:55:21.055685
3	Moises Robles	2002-01-01	2026-08-04	moises.robles@gemso.com.mx	aH@gMs#662	Practicante	1	2026-10-07 20:07:03.55088
\.


--
-- Name: anuncios_adj_id_anu_adj_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.anuncios_adj_id_anu_adj_seq', 1, false);


--
-- Name: anuncios_id_anu_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.anuncios_id_anu_seq', 2, true);


--
-- Name: anuncios_leidos_id_anu_lei_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.anuncios_leidos_id_anu_lei_seq', 1, false);


--
-- Name: departamentos_id_dep_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departamentos_id_dep_seq', 4, true);


--
-- Name: permisos_id_per_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permisos_id_per_seq', 1, false);


--
-- Name: usuario_permisos_id_usu_per_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuario_permisos_id_usu_per_seq', 1, false);


--
-- Name: usuarios_id_usu_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_usu_seq', 3, true);


--
-- Name: anuncios_adj anuncios_adj_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios_adj
    ADD CONSTRAINT anuncios_adj_pkey PRIMARY KEY (id_anu_adj);


--
-- Name: anuncios_leidos anuncios_leidos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios_leidos
    ADD CONSTRAINT anuncios_leidos_pkey PRIMARY KEY (id_anu_lei);


--
-- Name: anuncios anuncios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios
    ADD CONSTRAINT anuncios_pkey PRIMARY KEY (id_anu);


--
-- Name: departamentos departamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_pkey PRIMARY KEY (id_dep);


--
-- Name: permisos permisos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_nombre_key UNIQUE (nombre);


--
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id_per);


--
-- Name: anuncios_leidos uq_usuario_anuncio; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios_leidos
    ADD CONSTRAINT uq_usuario_anuncio UNIQUE (id_usu, id_anu);


--
-- Name: usuario_permisos uq_usuario_permiso; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT uq_usuario_permiso UNIQUE (id_usu, id_per);


--
-- Name: usuario_permisos usuario_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT usuario_permisos_pkey PRIMARY KEY (id_usu_per);


--
-- Name: usuarios usuarios_correo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usu);


--
-- Name: anuncios_adj anuncios_adj_id_anu_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios_adj
    ADD CONSTRAINT anuncios_adj_id_anu_fkey FOREIGN KEY (id_anu) REFERENCES public.anuncios(id_anu) ON DELETE CASCADE;


--
-- Name: anuncios anuncios_id_autor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios
    ADD CONSTRAINT anuncios_id_autor_fkey FOREIGN KEY (id_autor) REFERENCES public.usuarios(id_usu);


--
-- Name: anuncios anuncios_id_dep_destino_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios
    ADD CONSTRAINT anuncios_id_dep_destino_fkey FOREIGN KEY (id_dep_destino) REFERENCES public.departamentos(id_dep);


--
-- Name: anuncios anuncios_id_usu_destino_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios
    ADD CONSTRAINT anuncios_id_usu_destino_fkey FOREIGN KEY (id_usu_destino) REFERENCES public.usuarios(id_usu);


--
-- Name: anuncios_leidos anuncios_leidos_id_anu_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios_leidos
    ADD CONSTRAINT anuncios_leidos_id_anu_fkey FOREIGN KEY (id_anu) REFERENCES public.anuncios(id_anu) ON DELETE CASCADE;


--
-- Name: anuncios_leidos anuncios_leidos_id_usu_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios_leidos
    ADD CONSTRAINT anuncios_leidos_id_usu_fkey FOREIGN KEY (id_usu) REFERENCES public.usuarios(id_usu) ON DELETE CASCADE;


--
-- Name: usuario_permisos usuario_permisos_id_per_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT usuario_permisos_id_per_fkey FOREIGN KEY (id_per) REFERENCES public.permisos(id_per) ON DELETE CASCADE;


--
-- Name: usuario_permisos usuario_permisos_id_usu_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT usuario_permisos_id_usu_fkey FOREIGN KEY (id_usu) REFERENCES public.usuarios(id_usu) ON DELETE CASCADE;


--
-- Name: usuarios usuarios_id_departamento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_id_departamento_fkey FOREIGN KEY (id_departamento) REFERENCES public.departamentos(id_dep);


--
-- PostgreSQL database dump complete
--

\unrestrict TtmRElZHnZRU9Kg1fb0UVHUpa5sT9ddBky2wOyib6ciJRJXSfQMIlNMTdwd2HK5

