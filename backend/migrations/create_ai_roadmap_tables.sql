-- AI Adoption Roadmap Tables
-- Migration: create_ai_roadmap_tables.sql

-- AI Roadmap Configurations
CREATE TABLE IF NOT EXISTS ai_roadmap_configs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'My AI Roadmap',
  description TEXT,
  is_default BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Department/Business Units
CREATE TABLE IF NOT EXISTS roadmap_departments (
  id SERIAL PRIMARY KEY,
  roadmap_config_id INTEGER REFERENCES ai_roadmap_configs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  ai_adoption_score INTEGER DEFAULT 0,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Roadmap Nodes (Visual representation of projects/ideas)
CREATE TABLE IF NOT EXISTS roadmap_nodes (
  id SERIAL PRIMARY KEY,
  roadmap_config_id INTEGER REFERENCES ai_roadmap_configs(id) ON DELETE CASCADE,
  node_type VARCHAR(50) NOT NULL,
  
  -- References to existing data
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  idea_id VARCHAR,
  department_id INTEGER REFERENCES roadmap_departments(id) ON DELETE SET NULL,
  parent_node_id INTEGER REFERENCES roadmap_nodes(id) ON DELETE CASCADE,
  
  -- Visual properties
  position_x DECIMAL(10,2) NOT NULL DEFAULT 0,
  position_y DECIMAL(10,2) NOT NULL DEFAULT 0,
  width DECIMAL(10,2) DEFAULT 250,
  height DECIMAL(10,2) DEFAULT 120,
  
  -- Node-specific data
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'planned',
  priority VARCHAR(20) DEFAULT 'medium',
  estimated_roi DECIMAL(12,2),
  estimated_timeline VARCHAR(100),
  category VARCHAR(100),
  is_predefined_category BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  custom_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Dependencies/Connections between nodes
CREATE TABLE IF NOT EXISTS roadmap_edges (
  id SERIAL PRIMARY KEY,
  roadmap_config_id INTEGER REFERENCES ai_roadmap_configs(id) ON DELETE CASCADE,
  source_node_id INTEGER REFERENCES roadmap_nodes(id) ON DELETE CASCADE,
  target_node_id INTEGER REFERENCES roadmap_nodes(id) ON DELETE CASCADE,
  edge_type VARCHAR(50) DEFAULT 'dependency',
  label VARCHAR(255),
  is_critical BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Roadmap Snapshots (version history)
CREATE TABLE IF NOT EXISTS roadmap_snapshots (
  id SERIAL PRIMARY KEY,
  roadmap_config_id INTEGER REFERENCES ai_roadmap_configs(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_roadmap_configs_user ON ai_roadmap_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_nodes_config ON roadmap_nodes(roadmap_config_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_nodes_project ON roadmap_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_nodes_idea ON roadmap_nodes(idea_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_nodes_dept ON roadmap_nodes(department_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_nodes_parent ON roadmap_nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_nodes_category ON roadmap_nodes(category);
CREATE INDEX IF NOT EXISTS idx_roadmap_edges_config ON roadmap_edges(roadmap_config_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_edges_source ON roadmap_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_edges_target ON roadmap_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_departments_config ON roadmap_departments(roadmap_config_id);

-- Comments for documentation
COMMENT ON TABLE ai_roadmap_configs IS 'Stores AI adoption roadmap configurations for each user/client';
COMMENT ON TABLE roadmap_departments IS 'Business departments/units for organizing AI initiatives';
COMMENT ON TABLE roadmap_nodes IS 'Visual nodes representing projects, ideas, departments, or milestones';
COMMENT ON TABLE roadmap_edges IS 'Connections and dependencies between roadmap nodes';
COMMENT ON TABLE roadmap_snapshots IS 'Historical snapshots for versioning and rollback';

