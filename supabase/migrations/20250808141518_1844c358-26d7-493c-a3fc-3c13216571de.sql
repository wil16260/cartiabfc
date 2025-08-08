-- Insert GeoJSON templates for BFC region data
INSERT INTO public.geojson_templates (name, description, geojson_url, properties, style_config, is_active) VALUES
-- BFC region outline (blue line)
(
  'Région Bourgogne-Franche-Comté',
  'Contours de la région Bourgogne-Franche-Comté',
  '/data/bfc.geojsonl.json',
  '{"type": "region", "level": 1}',
  '{"fillColor": "transparent", "color": "#3b82f6", "weight": 3, "opacity": 1, "fillOpacity": 0}',
  true
),
-- BFC departments (yellow)
(
  'Départements BFC',
  'Départements de la région Bourgogne-Franche-Comté',
  '/data/dpt_bfc.geojsonl.json',
  '{"type": "department", "level": 2}',
  '{"fillColor": "#fbbf24", "color": "#f59e0b", "weight": 2, "opacity": 1, "fillOpacity": 0.3}',
  true
),
-- BFC communes (gray, conditional visibility)
(
  'Communes BFC',
  'Communes de la région Bourgogne-Franche-Comté (visible uniquement avec données communales)',
  '/data/com_bfc3.json',
  '{"type": "commune", "level": 3, "conditional_visibility": true, "requires_data": "commune"}',
  '{"fillColor": "#6b7280", "color": "#4b5563", "weight": 1, "opacity": 0.7, "fillOpacity": 0.2}',
  false
);