CREATE DATABASE IF NOT EXISTS smartbuspass;
USE smartbuspass;

CREATE TABLE IF NOT EXISTS users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(15) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('PASSENGER','DRIVER','ADMIN') NOT NULL DEFAULT 'PASSENGER',
  is_verified TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routes (
  route_id INT PRIMARY KEY AUTO_INCREMENT,
  route_name VARCHAR(100) NOT NULL,
  start_point VARCHAR(200) NOT NULL,
  end_point VARCHAR(200) NOT NULL,
  distance_km DECIMAL(6,2) NOT NULL,
  stops JSON,
  is_active TINYINT(1) DEFAULT 1,
  fee_amount DECIMAL(10,2) NOT NULL DEFAULT 500.00
);

CREATE TABLE IF NOT EXISTS bus_passes (
  pass_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  route_id INT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  status ENUM('PENDING','APPROVED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  qr_code TEXT,
  approved_by INT,
  fee_amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (route_id) REFERENCES routes(route_id),
  FOREIGN KEY (approved_by) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS buses (
  bus_id INT PRIMARY KEY AUTO_INCREMENT,
  bus_number VARCHAR(20) NOT NULL UNIQUE,
  route_id INT,
  driver_id INT,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (route_id) REFERENCES routes(route_id),
  FOREIGN KEY (driver_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS gps_logs (
  log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  bus_id INT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  speed_kmh DECIMAL(5,2) DEFAULT 0,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bus_id) REFERENCES buses(bus_id)
);

CREATE TABLE IF NOT EXISTS scan_logs (
  scan_id INT PRIMARY KEY AUTO_INCREMENT,
  pass_id INT NOT NULL,
  bus_id INT,
  scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  result ENUM('VALID','INVALID','EXPIRED') NOT NULL,
  FOREIGN KEY (pass_id) REFERENCES bus_passes(pass_id)
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id INT PRIMARY KEY AUTO_INCREMENT,
  pass_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING','COMPLETED','FAILED') DEFAULT 'PENDING',
  paid_at DATETIME,
  payment_ref VARCHAR(100),
  FOREIGN KEY (pass_id) REFERENCES bus_passes(pass_id)
);

-- Seed data
INSERT IGNORE INTO users (full_name, email, phone, password_hash, role) VALUES
('Super Admin', 'admin@smartbus.com', '9999999999', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN'),
('Test Driver', 'driver@smartbus.com', '8888888888', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'DRIVER');

INSERT IGNORE INTO routes (route_name, start_point, end_point, distance_km, stops, fee_amount) VALUES
('Route A - City Express', 'Central Station', 'Tech Park Gate 1', 18.5, '["Market Square","University Road","IT Hub"]', 450.00),
('Route B - North Line', 'Railway Station', 'North Campus', 12.0, '["Bus Stand","Government Hospital","Park Junction"]', 350.00),
('Route C - South Connect', 'Airport Road', 'South Mall', 22.3, '["Electronic City","Silk Board","Adugodi"]', 550.00);

INSERT IGNORE INTO buses (bus_number, route_id, driver_id) VALUES
('KA-01-BUS-001', 1, 2),
('KA-01-BUS-002', 2, 2),
('KA-01-BUS-003', 3, 2);
