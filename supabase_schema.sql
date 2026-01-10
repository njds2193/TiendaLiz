-- Create the products table
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_buy NUMERIC NOT NULL,
    price_sell NUMERIC NOT NULL,
    unit_price_sell NUMERIC,
    category TEXT,
    expiry_date DATE,
    supplier_contact TEXT, -- Stores "Code - Phone"
    image_url TEXT,
    qr_code_url TEXT,
    product_type TEXT DEFAULT 'unidades', -- 'paquete', 'unidades', 'ambos'
    units_per_package INTEGER DEFAULT 1,
    unit_cost NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for the products table
-- Allow public read access (for the PWA to display products)
CREATE POLICY "Allow public read access"
ON public.products
FOR SELECT
TO anon
USING (true);

-- Allow public insert access (for the PWA to add products)
-- Note: In a production app, you might want to restrict this to authenticated users
CREATE POLICY "Allow public insert access"
ON public.products
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow public update access (for editing products)
CREATE POLICY "Allow public update access"
ON public.products
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow public delete access (for deleting products)
CREATE POLICY "Allow public delete access"
ON public.products
FOR DELETE
TO anon
USING (true);

-- Create the storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product_images', 'product_images', true);

-- Set up storage policies
-- Allow public read access to the bucket
CREATE POLICY "Give public access to product_images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product_images');

-- Allow public upload access to the bucket
CREATE POLICY "Allow public uploads to product_images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'product_images');

-- Create index on category column for faster filtering and organization
CREATE INDEX idx_products_category ON public.products(category);

-- Create index on created_at for faster sorting
CREATE INDEX idx_products_created_at ON public.products(created_at DESC);

-- Create the product_history table
CREATE TABLE public.product_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'compra', 'venta', 'ajuste', etc.
    quantity INTEGER,
    total_buy NUMERIC,
    price_buy NUMERIC,
    price_sell NUMERIC,
    unit_cost NUMERIC,
    units_per_package INTEGER,
    unit_price_buy NUMERIC,
    unit_price_sell NUMERIC,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for product_history
ALTER TABLE public.product_history ENABLE ROW LEVEL SECURITY;

-- Policies for product_history
CREATE POLICY "Allow public read access history"
ON public.product_history
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow public insert access history"
ON public.product_history
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow public update access history"
ON public.product_history
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete access history"
ON public.product_history
FOR DELETE
TO anon
USING (true);

-- Create index for faster history lookups
CREATE INDEX idx_product_history_product_id ON public.product_history(product_id);
CREATE INDEX idx_product_history_created_at ON public.product_history(created_at DESC);
