/**
 * Catalogue types — mirror the real responses (checked against the demo DB):
 * product.service.ts, category, vendor_profile (public), review, professional_profile,
 * job, advertisement.
 */
import type { FileRef } from '@/types/api';

export interface LocalizedText {
  fr: string;
  en: string;
}

export type CategoryType = 'product' | 'business' | 'service' | 'job';

export interface Category {
  _id: string;
  name: LocalizedText;
  slug: string;
  image?: FileRef;
  parentId: string | null;
  type: CategoryType;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
}

/** Populated `categoryId` on products / workers / jobs. */
export interface CategoryRef {
  _id: string;
  name: LocalizedText;
  slug: string;
}

/** Populated `vendorId` on product lists (no phone, ever). */
export interface ProductVendorRef {
  _id: string;
  storeName: string;
  logo?: FileRef;
  address?: { city?: string; text?: string };
  isOpen: boolean;
  isPlatformStore?: boolean;
  marketName?: string;
  stats?: { ratingAvg?: number; ratingCount?: number; totalProducts?: number };
}

export type ProductTag = 'popular' | 'new' | 'bestseller' | string;

export interface Product {
  _id: string;
  vendorId: ProductVendorRef;
  categoryId: CategoryRef;
  name: string;
  slug: string;
  description?: string;
  price: number;
  discountPrice?: number;
  images: FileRef[];
  features: string[];
  inTheBox: string[];
  tags: ProductTag[];
  stockQty: number;
  minStockAlert: number;
  prepTimeMinutes?: number;
  isAvailable: boolean;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  createdAt: string;
}

export interface ProductDetails {
  product: Product;
  isFavorite: boolean;
}

export type ProductSort = 'newest' | 'popular' | 'rating' | 'price_asc' | 'price_desc';

/** GET /products query (all optional, strings on the wire). */
export interface ProductQuery {
  searchTerm?: string;
  category?: string;
  vendorId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  rating?: number;
  tags?: string;
  lat?: number;
  lng?: number;
  maxDistance?: number;
  sort?: ProductSort;
}

export interface PublicVendor {
  _id: string;
  /** The owner (to hide "apply" on my own store) */
  userId: string;
  storeName: string;
  logo?: FileRef;
  marketName?: string;
  address?: { text?: string; city?: string; country?: string; location?: { lat: number; lng: number } };
  isOpen: boolean;
  isPlatformStore: boolean;
  availability?: { enabled: boolean; days: string[]; openTime: string; closeTime: string };
  stats: { ratingAvg: number; ratingCount: number; totalOrders: number; totalProducts: number };
  businessCategoryId?: CategoryRef;
  createdAt: string;
}

export interface Review {
  _id: string;
  rating: number;
  comment?: string;
  images?: FileRef[];
  customerId?: { _id: string; name: string; avatar?: FileRef } | string;
  createdAt: string;
}

export interface Worker {
  _id: string;
  userId: { _id: string; name: string; avatar?: FileRef };
  profession?: string;
  summary?: string;
  photo?: FileRef;
  city?: string;
  skills: string[];
  languages: string[];
  hourlyRate?: number;
  experienceYears?: number;
  serviceCategoryId?: CategoryRef;
  /** days 0 (Sunday) … 6, hours "HH:mm" */
  workingHours?: { days: number[]; from: string; to: string };
  /** Photos of past work (max 10) */
  workPhotos?: FileRef[];
  ratingAvg: number;
  ratingCount: number;
  isPremium?: boolean;
}

export interface WorkerQuery {
  search?: string;
  categoryId?: string;
  city?: string;
  minRating?: number;
}

export type JobType = 'full_time' | 'part_time' | 'contract' | 'internship';
export type WorkplaceType = 'on_site' | 'remote' | 'hybrid';

export interface Job {
  _id: string;
  organizationName: string;
  organizationLogo?: FileRef;
  isVerifiedOrg: boolean;
  title: string;
  categoryId?: CategoryRef;
  jobType: JobType;
  workplace: WorkplaceType;
  country?: string;
  city?: string;
  area?: string;
  salaryCurrency: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryFrequency?: 'monthly' | 'weekly' | 'hourly';
  about: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  aboutCompany?: string;
  prefExperienceLevel?: string;
  prefMinEducation?: string;
  prefSkills: string[];
  prefLanguages: string[];
  applicationDeadline?: string;
  vacancies?: number;
  status: string;
  publishedAt?: string;
  createdAt: string;
  /** Present when the API computes a match for the signed-in user. */
  matchScore?: number;
}

export type AdPlacement = 'home' | 'category' | 'search';

export interface Advertisement {
  _id: string;
  name: string;
  advertiserName: string;
  type: 'banner' | 'popup' | 'interstitial';
  placement: AdPlacement;
  images: string[];
  linkUrl?: string;
  description?: string;
}
