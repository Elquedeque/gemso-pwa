-- ==========================================
--        ESTRUCTURA PWA GEMSO (PostgreSQL)
-- ==========================================

-- 1. Tabla Departamentos
CREATE TABLE departamentos (
    id_dep SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 2. Tabla Usuarios
CREATE TABLE usuarios (
    id_usu SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    fecha_ingreso DATE NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    puesto VARCHAR(100),
    id_departamento INTEGER NOT NULL REFERENCES departamentos(id_dep),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Permisos
CREATE TABLE permisos (
    id_per SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT
);

-- 4. Tabla Usuario_Permisos (Relación N:M)
CREATE TABLE usuario_permisos (
    id_usu_per SERIAL PRIMARY KEY,
    id_usu INTEGER REFERENCES usuarios(id_usu) ON DELETE CASCADE,
    id_per INTEGER REFERENCES permisos(id_per) ON DELETE CASCADE,
    CONSTRAINT uq_usuario_permiso UNIQUE (id_usu, id_per)
);

-- 5. Tabla Anuncios
CREATE TABLE anuncios (
    id_anu SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    contenido TEXT NOT NULL,
    categoria VARCHAR(50) NOT NULL, -- 'Global', 'Departamental', 'Personal'
    urgente BOOLEAN DEFAULT FALSE,
    id_autor INTEGER NOT NULL REFERENCES usuarios(id_usu),
    id_dep_destino INTEGER REFERENCES departamentos(id_dep),
    id_usu_destino INTEGER REFERENCES usuarios(id_usu),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla Anuncios Adjuntos
CREATE TABLE anuncios_adj (
    id_anu_adj SERIAL PRIMARY KEY,
    id_anu INTEGER REFERENCES anuncios(id_anu) ON DELETE CASCADE,
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo_archivo VARCHAR(50) NOT NULL,
    url_archivo TEXT NOT NULL
);

-- 7. Tabla Anuncios Leídos
CREATE TABLE anuncios_leidos (
    id_anu_lei SERIAL PRIMARY KEY,
    id_usu INTEGER REFERENCES usuarios(id_usu) ON DELETE CASCADE,
    id_anu INTEGER REFERENCES anuncios(id_anu) ON DELETE CASCADE,
    fecha_leido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuario_anuncio UNIQUE (id_usu, id_anu)
);