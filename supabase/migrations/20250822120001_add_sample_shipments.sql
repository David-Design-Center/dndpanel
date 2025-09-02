-- Insert sample shipments data for testing
INSERT INTO shipments (ref, consignee, shipper, vessel_carrier, etd, eta, container_n, description_of_goods, shipping_status) VALUES
  ('SH-2025-001', 'ABC Import Co.', 'XYZ Export Ltd.', 'MAERSK LINE', '2025-01-15', '2025-02-28', 'MSKU1234567', 'Electronics and Computer Parts', 'In Transit'),
  ('SH-2025-002', 'Global Trade Inc.', 'Asia Supply Co.', 'COSCO SHIPPING', '2025-01-20', '2025-03-05', 'CSQU9876543', 'Furniture and Home Goods', 'Customs Clearance'),
  ('SH-2025-003', 'Import Solutions LLC', 'Euro Exports GmbH', 'HAPAG LLOYD', '2025-01-25', '2025-03-10', 'HLCU5555555', 'Industrial Machinery', 'Processing'),
  ('SH-2025-004', 'Pacific Trading', 'Ocean Freight Co.', 'EVERGREEN', '2025-02-01', '2025-03-15', 'EGHU7777777', 'Textiles and Clothing', 'Delivered'),
  ('SH-2025-005', 'Metro Imports', 'Continental Shipping', 'MSC', '2025-02-05', '2025-03-20', 'MSCU3333333', 'Food and Beverages', 'Loading')
ON CONFLICT DO NOTHING;
