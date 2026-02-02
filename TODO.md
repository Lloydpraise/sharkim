# Meta Pixel Installation and Event Tracking Plan

## Overview
Install Meta Pixel on all pages (index, product, shop, checkout) and set up event tracking for major e-commerce events to enhance Facebook advertising and analytics.

## Tasks

### 1. Install Meta Pixel Base Code
- [x] Add Meta Pixel code to index.html (after Google Analytics)
- [x] Add Meta Pixel code to product.html (after Google Analytics)
- [x] Add Meta Pixel code to shop.html (after Google Analytics)
- [ ] Add Meta Pixel code to checkout.html (after Google Analytics)

### 2. Set Up Event Tracking
- [x] ViewContent event on product.html (when product loads)
- [ ] Search event on shop.html (when AI search is performed)
- [ ] AddToCart event in js/cart.js (when item added to cart)
- [ ] InitiateCheckout event on checkout.html (when checkout page loads)

### 3. Testing
- [ ] Test pixel installation on all pages
- [ ] Test event firing in Meta Pixel Helper or Facebook Events Manager
- [ ] Verify no console errors

## Meta Pixel ID
1815039102579831

## Events to Track
- PageView (automatic on all pages)
- ViewContent (product pages)
- Search (shop page searches)
- AddToCart (cart additions)
- InitiateCheckout (checkout page load)
