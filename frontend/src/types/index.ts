export type UserRole = 'client' | 'provider' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  phone?: string;
  location?: string;
  createdAt: string;
  status?: 'active' | 'blocked';
  blockReason?: string;
}

export interface Provider {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  coverImage: string;
  bio: string;
  category: ServiceCategory;
  location: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  yearsExperience: number;
  hourlyRate: number;
  verified: boolean;
  skills: string[];
  portfolio: PortfolioItem[];
  services: Service[];
  availability: string;
  responseTime: string;
  featured?: boolean;
}

export interface PortfolioItem {
  id: string;
  title: string;
  image: string;
  description: string;
}

export interface Service {
  id: string;
  providerId: string;
  title: string;
  description: string;
  price: number;
  priceType: 'fixed' | 'hourly' | 'starting_at';
  category: ServiceCategory;
  backendCategory?: string;
  duration?: string;
  image?: string;
}

export type ServiceCategory =
  | 'plumbing'
  | 'electrical'
  | 'cleaning'
  | 'painting'
  | 'landscaping'
  | 'moving'
  | 'carpentry'
  | 'hvac';

export const CATEGORIES: { value: ServiceCategory; label: string; icon: string }[] = [
  { value: 'plumbing', label: 'Plumbing', icon: '🔧' },
  { value: 'electrical', label: 'Electrical', icon: '⚡' },
  { value: 'cleaning', label: 'Cleaning', icon: '✨' },
  { value: 'painting', label: 'Painting', icon: '🎨' },
  { value: 'landscaping', label: 'Landscaping', icon: '🌿' },
  { value: 'moving', label: 'Moving', icon: '📦' },
  { value: 'carpentry', label: 'Carpentry', icon: '🪚' },
  { value: 'hvac', label: 'HVAC', icon: '❄️' },
];

export type RequestStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'awarded' | 'disputed';
export type BidStatus = 'pending' | 'accepted' | 'declined' | 'rejected' | 'withdrawn' | 'expired';
export type BookingStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
export type ComplaintStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

export interface ServiceRequest {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  category: ServiceCategory;
  backendCategory?: string;
  budget: number;
  location: string;
  status: RequestStatus;
  urgency: 'low' | 'medium' | 'high';
  createdAt: string;
  bidsCount: number;
  serviceId?: string;
  preferredTime?: string;
}

export interface Bid {
  id: string;
  requestId: string;
  requestTitle: string;
  providerId: string;
  providerName: string;
  providerAvatar: string;
  providerRating: number;
  amount: number;
  message: string;
  estimatedDuration: string;
  status: BidStatus;
  createdAt: string;
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceTitle: string;
  providerId: string;
  providerName: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  status: BookingStatus;
  amount: number;
}

export interface Review {
  id: string;
  providerId: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: { id: string; name: string; avatar: string }[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'bid' | 'booking' | 'order' | 'message' | 'review' | 'complaint' | 'system' | 'verification';
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export type ComplaintIssueType = 'poor_quality' | 'no_show' | 'overcharge' | 'rude_behavior' | 'damage' | 'other';

export const COMPLAINT_ISSUE_TYPES: { value: ComplaintIssueType; label: string }[] = [
  { value: 'poor_quality', label: 'Poor Quality Work' },
  { value: 'no_show', label: 'No Show / Late Arrival' },
  { value: 'overcharge', label: 'Overcharging' },
  { value: 'rude_behavior', label: 'Rude / Unprofessional Behavior' },
  { value: 'damage', label: 'Property Damage' },
  { value: 'other', label: 'Other' },
];

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  providerId?: string;
  providerName?: string;
  issueType?: ComplaintIssueType;
  subject: string;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
  response?: string;
}

export interface VerificationFile {
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface VerificationRequest {
  id: string;
  providerId: string;
  providerName: string;
  providerAvatar: string;
  category: ServiceCategory;
  documents: string[];
  files: VerificationFile[];
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  yearsExperience?: number;
  serviceAreas?: string[];
}
