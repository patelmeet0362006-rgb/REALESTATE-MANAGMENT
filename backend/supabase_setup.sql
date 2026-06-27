-- ============================================================
-- APEX URBAN REALTY - COMPLETE DATABASE RESET & SETUP
-- ============================================================
-- INSTRUCTIONS: Copy this ENTIRE script and paste into
-- Supabase Dashboard → SQL Editor → New Query → Run
--
-- This script SAFELY drops everything and recreates from scratch.
-- It is safe to run multiple times.
--
-- NOTE: Consultations are NOT seeded here. They come from
-- the main website when clients submit the contact form
-- (index.html #contact) or the consultation page (consultation.html).
-- Admin assigns an agent → agent sees it in their panel.
-- ============================================================


-- ============================================================
-- STEP 1: DROP ALL TABLES (order matters for foreign keys)
-- ============================================================

DROP TABLE IF EXISTS agent_tasks CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS staff_users CASCADE;
DROP TABLE IF EXISTS regular_users CASCADE;


-- ============================================================
-- STEP 2: CREATE ALL TABLES FRESH
-- ============================================================

-- 2A. Regular Clients (Standard account users from main website)
CREATE TABLE regular_users (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2B. Staff Users (Admins and Agents)
-- Composite primary key (email, role) allows same email for both admin and agent
CREATE TABLE staff_users (
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'agent')),
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (email, role)
);

-- 2C. Properties Database
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('villa', 'penthouse', 'apartment', 'house')),
    purpose TEXT NOT NULL CHECK (purpose IN ('buy', 'rent')),
    price NUMERIC(15, 2) NOT NULL,
    location TEXT NOT NULL,
    beds INTEGER NOT NULL,
    baths NUMERIC(3, 1) NOT NULL,
    area INTEGER NOT NULL,
    image TEXT NOT NULL DEFAULT 'images/listing-1.png',
    badge TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2D. User Favorites
CREATE TABLE user_favorites (
    id SERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    property_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2E. Client Tour Consultations
-- Data comes from main website forms (contact.js + consultation.js)
-- Admin assigns agent_email → agent sees it in their panel
CREATE TABLE consultations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    interest_type TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
    assigned_agent_email TEXT,
    meeting_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2F. Agent Task Checklist
-- Agents create their own tasks from the agent panel
CREATE TABLE agent_tasks (
    id SERIAL PRIMARY KEY,
    agent_email TEXT NOT NULL,
    task_title TEXT NOT NULL,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ============================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE regular_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 4: CREATE RLS POLICIES (fresh tables = no conflicts)
-- ============================================================

CREATE POLICY "public_access_regular_users" ON regular_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access_staff_users" ON staff_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access_properties" ON properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access_user_favorites" ON user_favorites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access_consultations" ON consultations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access_agent_tasks" ON agent_tasks FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- STEP 5: SEED STAFF ACCOUNTS (Admin + Agent login credentials)
-- ============================================================

-- 3 Admin Accounts
INSERT INTO staff_users (email, name, password, role, phone) VALUES
('meet@apex.com',  'Patel Meet',  'meet@123',  'admin', '+91 99999 88888'),
('mahir@apex.com', 'Patel Mahir', 'mahir@123', 'admin', '+91 99999 77777'),
('nitin@apex.com', 'Nitin Patel', 'nitin@123', 'admin', '+91 99999 66666');

-- Agent Accounts
INSERT INTO staff_users (email, name, password, role, phone) VALUES
('vinayak@apex.com', 'mehta vinayak', 'vinayak@123', 'agent', '+91 98765 43210'),
('haresh@apex.com', 'Gujar Haresh', 'haresh@123', 'agent', '+91 98765 43210'),
('nitin@apex.com', 'Patel Nitin', 'nitin@123', 'agent', '+91 98765 43210'),
('vishva@apex.com', 'Chaudhary vishva', 'vishva@123', 'agent', '+91 98765 43210'),
('lokesh@apex.com', 'Mehta lokesh', 'lokesh@123', 'agent', '+91 98765 43210');

-- ============================================================
-- STEP 6: SEED PROPERTIES (8 Standard)
-- ============================================================

INSERT INTO properties (id, title, type, purpose, price, location, beds, baths, area, image, badge) VALUES
(1,  'The Grand Zenith Villa',        'villa',     'buy',  48500000,  'Bandra West, Mumbai, Maharashtra',     5, 6.0, 6200, 'images/listing-1.png', 'new'),
(2,  'Metropolitan Sky Penthouse',    'penthouse', 'buy',  32000000,  'Chanakyapuri, New Delhi, Delhi',        3, 3.5, 3400, 'images/listing-2.png', 'hot'),
(3,  'Whispering Pines Sanctuary',    'villa',     'buy',  21500000,  'Koregaon Park, Pune, Maharashtra',      4, 4.5, 4100, 'images/listing-3.png', 'new'),
(4,  'Neo-Minimalist Smart Villa',    'villa',     'buy',  39000000,  'GIFT City, Gandhinagar, Gujarat',       5, 5.0, 5800, 'images/listing-4.png', 'hot'),
(5,  'Serene Waterfront Haven',       'apartment', 'buy',  14500000,  'Marine Drive, Mumbai, Maharashtra',     2, 2.0, 1800, 'images/listing-1.png', ''),
(6,  'The Obsidian Penthouse',        'penthouse', 'buy',  28000000,  'Vasant Kunj, New Delhi, Delhi',         3, 3.0, 2900, 'images/listing-2.png', ''),
(7,  'GIFT Towers Executive Suite',   'apartment', 'rent', 65000,     'GIFT City, Gandhinagar, Gujarat',       2, 2.0, 1150, 'images/listing-3.png', 'new'),
(8,  'Lodi Colony Regency Suite',     'apartment', 'rent', 82000,     'Lodi Colony, New Delhi, Delhi',         1, 1.5, 950,  'images/listing-4.png', 'hot');

-- Reset the sequence so new properties get IDs after the seeded ones
SELECT setval('properties_id_seq', (SELECT MAX(id) FROM properties));


-- ============================================================
-- NO CONSULTATION OR TASK SEED DATA
-- ============================================================
-- Consultations come from the main website when clients
-- submit the contact form (index.html) or consultation
-- page (consultation.html). Both forms save to this
-- 'consultations' table in Supabase.
--
-- FLOW:
-- 1. Client fills form on main website → saved to 'consultations' table
-- 2. Admin opens admin panel → sees all consultations
-- 3. Admin clicks "Manage" → assigns an agent (e.g. meet@apex.com)
-- 4. Agent opens agent panel → sees only their assigned consultations
-- 5. Agent updates status to scheduled/completed
--
-- Agent tasks are created by agents themselves from the agent panel.
-- ============================================================


-- ============================================================
-- DONE! Run this script in Supabase SQL Editor.
-- ============================================================
--
-- ADMIN LOGIN CREDENTIALS:
--   1. meet@apex.com  / meet@123
--   2. mahir@apex.com / mahir@123
--   3. nitin@apex.com / nitin@123
--
-- AGENT LOGIN CREDENTIALS:
--   1. meet@apex.com  / meet@123
--
-- DATA FLOW:
--   Main Website Contact Form → Supabase 'consultations' table
--   → Admin Panel (sees all) → Assigns Agent
--   → Agent Panel (sees assigned ones) → Updates status
-- ============================================================
