# Order module

## API

All order endpoints require JWT authentication.

- `GET /api/v1/orders/`: list the authenticated user's orders.
- `POST /api/v1/orders/quote/`: validate product availability and return a server-calculated price quote. Body: `{"items":[{"product_id":1,"quantity":2}]}`.
- `POST /api/v1/orders/`: create an order from `items` and `shipping_address`. Prices and shipping cost are calculated by Django; client-supplied prices are ignored.
- `GET /api/v1/orders/<id>/`: retrieve one order belonging to the authenticated user.
- `POST /api/v1/orders/<id>/cancel/`: cancel a pending unpaid order and restore reserved stock.

## Inventory reservation and expiry

Checkout reserves stock in the same database transaction as order creation. Pending unpaid orders expire after `ORDER_PAYMENT_WINDOW_MINUTES` (default 15 minutes). When cancelled or expired, reserved stock is returned exactly once.

Run this command periodically (for example, every minute) using Windows Task Scheduler, cron, or your deployment scheduler:

```bash
python manage.py expire_pending_orders
```

The command is safe to rerun. If it is not scheduled, expired orders may keep stock reserved until a user cancels them or the command is run manually.

## Configuration

- `ORDER_SHIPPING_COST`: shipping charge in the store's configured price unit (default `40000`).
- `ORDER_PAYMENT_WINDOW_MINUTES`: pending order reservation duration (default `15`).

## Known next steps

- No payment gateway is connected yet. Orders remain unpaid until a verified payment callback is implemented; never set `is_paid=True` based only on a frontend request.
- Coupon/Allowance redemption is not part of checkout yet. The existing Allowance schema has no per-user usage limits or redemption audit trail.
- The quote can become stale between preview and order creation. The create endpoint rechecks stock and prices and records the final server-side price.
- For production concurrency guarantees, use a database with row-level locking (such as PostgreSQL); SQLite is suitable for local development but does not provide equivalent `select_for_update` behavior.
