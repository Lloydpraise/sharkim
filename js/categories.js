/*
  Global categories map for Sharkim Traders
  - Each main category contains an array of subcategories
  - Exposed on window as CATEGORIES and MAIN_CATEGORIES
*/

(function(){
  const CATEGORIES = {
    "Trending": [],

    "Electronics": [
      "Accessories and Supplies for Electronics (chargers, earphones, cases)",
      "Laptops & Computers",
      "Computer Accessories (keyboards, mice, storage)",
      "TV & DVD Equipment",
      "Computer Hardware",
      "Audio & Music Equipment",
      "Cameras & Photography",
      "Networking Products",
      "Video Game Consoles",
      "Security and Surveillance",
      "Video Games",
      "Software",
      "Printers & Scanners",
      "Photo & Video Cameras",
      "Headphones",
      "Computer Monitors",
      "Mobile Phones & Tablets",
      "Mobile Phones",
      "Accessories for Phones & Tablets",
      "Smartwatches & Trackers",
      "Tablets"
    ],

    "Home, Furniture & Appliances": [
      "Furniture",
      "Kitchenware & Cookware",
      "Home Accessories",
      "Home Appliances",
      "Storage & Organization",
      "Household Chemicals",
      "Lighting",
      "Garden Supplies",
      "Kitchen Appliances"
    ],

    "Fashion": [
      "Men’s Fashion",
      "Women’s Fashion",
      "Kids & Baby Fashion"
    ],

    "Babies & Kids": [
      "Babies and Kids Accessories",
      "Playground Equipment",
      "Care & Feeding",
      "Children’s Clothing",
      "Children’s Furniture",
      "Children’s Shoes",
      "Maternity & Pregnancy",
      "Transport & Safety",
      "Toys, Games, & Bikes",
      "Baby Gear & Equipment"
    ],

    "Vehicles": [
      "Cars",
      "Buses & microbuses",
      "Motorcycles & Scooters",
      "Construction & Heavy Machinery",
      "Bicycles",
      "Vehicle Parts & Accessories",
      "Trucks & Trailers",
      "Boats & Watercraft",
      "Automotive services"
    ],

    "Commercial Equipment & Tools": [
      "Safety Equipment & Protective Gear",
      "Medical Equipment & Supplies",
      "Manufacturing Equipment",
      "Manufacturing Material & Supplies",
      "Printing & Graphics Equipment",
      "Restaurant & Catering Equipment",
      "Salon & Beauty Equipment",
      "Stage & Event Equipment",
      "Stationery & Office Equipment",
      "Retail & Store Equipment"
    ],

    "Leisure & Activities": [
      "Smoking Accessories",
      "Arts, Crafts, & Awards",
      "Books & Table Games",
      "Outdoor Gear",
      "Music & Video",
      "Musical Instruments & Gear",
      "Sports Equipment"
    ],

    "Sports, Arts & Outdoors": [
      "Sporting Goods",
      "Musical Instruments",
      "Books & Stationery",
      "Camping & Outdoor Gear"
    ],

    
    "Food, Agriculture, & Farming": [
      "Farm Machinery & Equipment",
      "Feeds, Supplements, & Seeds",
      "Farm Animals",
      "Animal Feeds & Supplements",
      "Food & Beverages"
    ],
    
     "Beauty & Personal Care": [
      "Massager",
      "Oral Care",
      "Body Care",
      "Fragrances",
      "Hair Beauty",
      "Make-up",
      "Sexual Wellness",
      "Face Care",
      "Tools & Accessories",
      "Vitamins & Supplements"
    ],


    "Repair & Construction": [
      "Electrical Hand Tools",
      "Hardware & Fasteners",
      "Building Materials & Supplies",
      "Doors & Security",
      "Electrical Equipment",
      "Hand Tools",
      "Measuring & Testing Tools",
      "Plumbing & Water Systems",
      "Solar Energy",
      "Windows & Glass",
      "Other Repair & Construction Items"
    ]
  };

  function titleCase(s){ return (s||'').replace(/\s+/g,' ').trim(); }
  function getSubcategories(main){ return (CATEGORIES[main] || []).slice(); }
  function getAllMainCategories(){ return Object.keys(CATEGORIES); }

  window.CATEGORIES = CATEGORIES;
  window.MAIN_CATEGORIES = getAllMainCategories();
  window.getSubcategories = getSubcategories;
  window.normalizeCategory = titleCase;
})();
