ALTER TABLE public.orders 
  ADD COLUMN is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN deleted_by uuid,
  ADD COLUMN pre_delete_status text;

CREATE INDEX idx_orders_is_deleted ON public.orders(is_deleted);