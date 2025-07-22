
-- Initialize the database schema for the printer dashboard
CREATE TABLE IF NOT EXISTS print_data (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    total_duration INTEGER NOT NULL, -- Duration in seconds
    filament_total INTEGER NOT NULL, -- Filament length in mm
    filament_type VARCHAR(50) NOT NULL,
    print_start INTEGER NOT NULL, -- Unix timestamp
    print_end INTEGER NOT NULL, -- Unix timestamp
    filament_weight DECIMAL(8,2), -- Weight in grams
    printer_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_print_data_status ON print_data(status);
CREATE INDEX IF NOT EXISTS idx_print_data_printer ON print_data(printer_name);
CREATE INDEX IF NOT EXISTS idx_print_data_filament_type ON print_data(filament_type);
CREATE INDEX IF NOT EXISTS idx_print_data_print_start ON print_data(print_start);

-- Insert sample data for testing
INSERT INTO print_data (filename, status, total_duration, filament_total, filament_type, print_start, print_end, filament_weight, printer_name) VALUES
('test_cube_v2.gcode', 'completed', 7200, 15000, 'PLA', 1703001600, 1703008800, 45.2, 'Bumblebee'),
('miniature_house.gcode', 'completed', 14400, 28000, 'PETG', 1703088000, 1703102400, 82.5, 'Sentinel'),
('prototype_bracket.gcode', 'failed', 3600, 8500, 'ABS', 1703174400, 1703178000, 24.3, 'Micron'),
('decorative_vase.gcode', 'completed', 10800, 22000, 'PLA', 1703260800, 1703271600, 66.8, 'Drill Sargeant'),
('mechanical_gear.gcode', 'completed', 5400, 12000, 'ASA', 1703347200, 1703352600, 35.7, 'VZBot')
ON CONFLICT DO NOTHING;
