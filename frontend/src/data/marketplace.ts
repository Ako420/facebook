/* ============================================================================
   Marketplace listings. Prices are in cents — render them with formatPrice().
   ========================================================================== */

import type { ID, Listing } from "./types";
import { photo } from "./media";
import { users } from "./users";
import { daysAgo, hoursAgo } from "./time";

export const listings: Listing[] = [
  {
    id: "l1",
    title: "English willow bat, grade 2, lightly used",
    priceCents: 14_500_00,
    currency: "INR",
    category: "Sporting Goods",
    location: "Bengaluru",
    image: photo("listing-bat", 600, 600),
    sellerId: users.kabir.id,
    postedAt: hoursAgo(4),
    isSaved: false,
  },
  {
    id: "l2",
    title: "Wicketkeeping gloves, size L",
    priceCents: 3_200_00,
    currency: "INR",
    category: "Sporting Goods",
    location: "Bengaluru",
    image: photo("listing-gloves", 600, 600),
    sellerId: users.zoya.id,
    postedAt: hoursAgo(20),
    isSaved: true,
  },
  {
    id: "l3",
    title: "Bowling machine, club spec, works perfectly",
    priceCents: 62_000_00,
    currency: "INR",
    category: "Sporting Goods",
    location: "Pune",
    image: photo("listing-machine", 600, 600),
    sellerId: users.dev.id,
    postedAt: daysAgo(1),
    isSaved: false,
  },
  {
    id: "l4",
    title: "70-200mm telephoto lens",
    priceCents: 88_000_00,
    currency: "INR",
    category: "Electronics",
    location: "Kochi",
    image: photo("listing-lens", 600, 600),
    sellerId: users.neha.id,
    postedAt: daysAgo(2),
    isSaved: true,
  },
  {
    id: "l5",
    title: "Ergonomic desk chair, one year old",
    priceCents: 9_800_00,
    currency: "INR",
    category: "Home",
    location: "Bengaluru",
    image: photo("listing-chair", 600, 600),
    sellerId: users.priya.id,
    postedAt: daysAgo(3),
    isSaved: false,
  },
  {
    id: "l6",
    title: "Spikes, size 9, worn twice",
    priceCents: 2_400_00,
    currency: "INR",
    category: "Clothing",
    location: "Bengaluru",
    image: photo("listing-spikes", 600, 600),
    sellerId: users.ishaan.id,
    postedAt: daysAgo(5),
    isSaved: false,
  },
];

export const savedListings: Listing[] = listings.filter((l) => l.isSaved);

export const listingById = (id: ID): Listing | undefined =>
  listings.find((l) => l.id === id);

export const marketplaceCategories: string[] = [
  "All",
  "Sporting Goods",
  "Electronics",
  "Home",
  "Clothing",
  "Vehicles",
];
