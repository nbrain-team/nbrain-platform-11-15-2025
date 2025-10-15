-- AI Adoption Roadmap Tables - V2 Update
-- Migration: update_roadmap_tables_v2.sql
-- Adds category support and parent node relationships

-- Add new columns to roadmap_nodes if they don't exist
DO $$ 
BEGIN
  -- Add parent_node_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='roadmap_nodes' AND column_name='parent_node_id') THEN
    ALTER TABLE roadmap_nodes ADD COLUMN parent_node_id INTEGER REFERENCES roadmap_nodes(id) ON DELETE CASCADE;
    CREATE INDEX idx_roadmap_nodes_parent ON roadmap_nodes(parent_node_id);
  END IF;

  -- Add category column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='roadmap_nodes' AND column_name='category') THEN
    ALTER TABLE roadmap_nodes ADD COLUMN category VARCHAR(100);
    CREATE INDEX idx_roadmap_nodes_category ON roadmap_nodes(category);
  END IF;

  -- Add is_predefined_category column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='roadmap_nodes' AND column_name='is_predefined_category') THEN
    ALTER TABLE roadmap_nodes ADD COLUMN is_predefined_category BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Update existing node_type to support new types
-- (No changes needed as VARCHAR(50) already supports 'category' and 'subcategory')

COMMENT ON COLUMN roadmap_nodes.parent_node_id IS 'Parent node for hierarchical organization (e.g., sub-categories under categories)';
COMMENT ON COLUMN roadmap_nodes.category IS 'Business category (Sales, Marketing, HR, Operations, Finance, Other, or The Brain)';
COMMENT ON COLUMN roadmap_nodes.is_predefined_category IS 'Whether this is a system-defined category node';

