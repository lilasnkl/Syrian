import type { User, Provider, ServiceRequest, Bid, Conversation, Message, Notification, Review, Complaint, VerificationRequest } from '@/types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alex Chen', email: 'alex@demo.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', role: 'client', location: 'New York, NY', createdAt: '2024-01-15' },
  { id: 'u2', name: 'Sarah Miller', email: 'sarah@demo.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', role: 'provider', location: 'Los Angeles, CA', createdAt: '2023-08-20' },
  { id: 'u3', name: 'Admin User', email: 'admin@demo.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', role: 'admin', location: 'San Francisco, CA', createdAt: '2023-01-01' },
];

export const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'p1', userId: 'u2', name: 'Sarah Miller', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    coverImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=400&fit=crop',
    bio: 'Licensed master plumber with 12 years of experience. Specializing in residential and commercial plumbing solutions.',
    category: 'plumbing', location: 'Los Angeles, CA', rating: 4.9, reviewCount: 127, completedJobs: 340,
    yearsExperience: 12, hourlyRate: 85, verified: true,
    skills: ['Pipe Repair', 'Water Heater', 'Drain Cleaning', 'Fixture Installation', 'Emergency Services'],
    portfolio: [
      { id: 'po1', title: 'Kitchen Renovation', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=300&fit=crop', description: 'Complete kitchen plumbing overhaul' },
      { id: 'po2', title: 'Bathroom Remodel', image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop', description: 'Modern bathroom installation' },
    ],
    services: [
      { id: 's1', providerId: 'p1', title: 'Emergency Pipe Repair', description: 'Fast response for burst or leaking pipes', price: 150, priceType: 'starting_at', category: 'plumbing', duration: '1-3 hours' },
      { id: 's2', providerId: 'p1', title: 'Water Heater Installation', description: 'Professional installation of tank or tankless water heaters', price: 500, priceType: 'fixed', category: 'plumbing', duration: '3-5 hours' },
    ],
    availability: 'Mon-Sat, 7AM-6PM', responseTime: '< 1 hour', featured: true,
  },
  {
    id: 'p2', userId: 'p2u', name: 'Marcus Johnson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
    coverImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&h=400&fit=crop',
    bio: 'Certified electrician providing safe, code-compliant electrical services for homes and businesses.',
    category: 'electrical', location: 'Chicago, IL', rating: 4.8, reviewCount: 95, completedJobs: 280,
    yearsExperience: 10, hourlyRate: 95, verified: true,
    skills: ['Wiring', 'Panel Upgrades', 'Lighting', 'EV Charger Install', 'Smart Home'],
    portfolio: [
      { id: 'po3', title: 'Smart Home Setup', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop', description: 'Full smart home electrical integration' },
    ],
    services: [
      { id: 's3', providerId: 'p2', title: 'Electrical Panel Upgrade', description: 'Upgrade your electrical panel for modern demands', price: 1200, priceType: 'starting_at', category: 'electrical', duration: '4-8 hours' },
      { id: 's4', providerId: 'p2', title: 'Lighting Installation', description: 'Indoor and outdoor lighting solutions', price: 75, priceType: 'hourly', category: 'electrical' },
    ],
    availability: 'Mon-Fri, 8AM-5PM', responseTime: '< 2 hours', featured: true,
  },
  {
    id: 'p3', userId: 'p3u', name: 'Emily Torres', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    coverImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=400&fit=crop',
    bio: 'Professional cleaning service with eco-friendly products. Residential and commercial cleaning.',
    category: 'cleaning', location: 'Miami, FL', rating: 4.7, reviewCount: 210, completedJobs: 520,
    yearsExperience: 8, hourlyRate: 45, verified: true,
    skills: ['Deep Cleaning', 'Move-in/Move-out', 'Office Cleaning', 'Carpet Cleaning', 'Window Washing'],
    portfolio: [], services: [
      { id: 's5', providerId: 'p3', title: 'Deep House Cleaning', description: 'Thorough cleaning of your entire home', price: 200, priceType: 'starting_at', category: 'cleaning', duration: '3-5 hours' },
    ],
    availability: 'Mon-Sun, 7AM-7PM', responseTime: '< 30 min', featured: true,
  },
  {
    id: 'p4', userId: 'p4u', name: 'David Park', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    coverImage: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=1200&h=400&fit=crop',
    bio: 'Interior and exterior painting professional. Color consultation included with every project.',
    category: 'painting', location: 'Seattle, WA', rating: 4.6, reviewCount: 68, completedJobs: 150,
    yearsExperience: 6, hourlyRate: 55, verified: false,
    skills: ['Interior Painting', 'Exterior Painting', 'Color Consultation', 'Cabinet Refinishing', 'Wallpaper'],
    portfolio: [], services: [
      { id: 's6', providerId: 'p4', title: 'Interior Room Painting', description: 'Professional painting for any room', price: 300, priceType: 'starting_at', category: 'painting', duration: '1-2 days' },
    ],
    availability: 'Mon-Fri, 8AM-6PM', responseTime: '< 4 hours',
  },
  {
    id: 'p5', userId: 'p5u', name: 'Lisa Nguyen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
    coverImage: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&h=400&fit=crop',
    bio: 'Award-winning landscape designer creating beautiful outdoor spaces for over 15 years.',
    category: 'landscaping', location: 'Portland, OR', rating: 4.9, reviewCount: 89, completedJobs: 200,
    yearsExperience: 15, hourlyRate: 70, verified: true,
    skills: ['Garden Design', 'Lawn Care', 'Hardscaping', 'Irrigation', 'Tree Service'],
    portfolio: [], services: [
      { id: 's7', providerId: 'p5', title: 'Landscape Design', description: 'Custom landscape design for your property', price: 500, priceType: 'starting_at', category: 'landscaping' },
    ],
    availability: 'Mon-Sat, 6AM-4PM', responseTime: '< 3 hours', featured: true,
  },
  {
    id: 'p6', userId: 'p6u', name: 'James Wright', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=400&fit=crop',
    bio: 'Reliable moving services with care for your belongings. Local and long-distance moves.',
    category: 'moving', location: 'Denver, CO', rating: 4.5, reviewCount: 142, completedJobs: 380,
    yearsExperience: 9, hourlyRate: 60, verified: true,
    skills: ['Local Moving', 'Long Distance', 'Packing', 'Furniture Assembly', 'Storage'],
    portfolio: [], services: [
      { id: 's8', providerId: 'p6', title: 'Local Moving Service', description: 'Professional local moving with packing options', price: 400, priceType: 'starting_at', category: 'moving', duration: '4-8 hours' },
    ],
    availability: 'Mon-Sun, 6AM-8PM', responseTime: '< 1 hour',
  },
];

export const MOCK_REQUESTS: ServiceRequest[] = [
  { id: 'r1', clientId: 'u1', clientName: 'Alex Chen', title: 'Kitchen Sink Replacement', description: 'Need a new kitchen sink installed. Old one is leaking badly.', category: 'plumbing', budget: 500, location: 'New York, NY', status: 'open', urgency: 'high', createdAt: '2025-02-20', bidsCount: 3 },
  { id: 'r2', clientId: 'u1', clientName: 'Alex Chen', title: 'Living Room Repaint', description: 'Want to repaint living room. Approximately 400 sq ft.', category: 'painting', budget: 800, location: 'New York, NY', status: 'open', urgency: 'low', createdAt: '2025-02-18', bidsCount: 2 },
  { id: 'r3', clientId: 'u1', clientName: 'Alex Chen', title: 'Electrical Panel Inspection', description: 'Panel is making buzzing noise. Need professional inspection.', category: 'electrical', budget: 300, location: 'New York, NY', status: 'in_progress', urgency: 'medium', createdAt: '2025-02-15', bidsCount: 4 },
  { id: 'r4', clientId: 'c2', clientName: 'Jordan Lee', title: 'Deep Cleaning for Move-out', description: 'Moving out of 2-bedroom apartment, need thorough cleaning.', category: 'cleaning', budget: 350, location: 'Miami, FL', status: 'open', urgency: 'medium', createdAt: '2025-02-22', bidsCount: 5 },
  { id: 'r5', clientId: 'c3', clientName: 'Sam Rivera', title: 'Backyard Landscaping', description: 'Want to redesign backyard with new plants and stone pathway.', category: 'landscaping', budget: 2000, location: 'Portland, OR', status: 'completed', urgency: 'low', createdAt: '2025-01-10', bidsCount: 3 },
  { id: 'r6', clientId: 'c4', clientName: 'Pat Morgan', title: 'Office Relocation', description: 'Small office move — 5 desks, server equipment, filing cabinets.', category: 'moving', budget: 1500, location: 'Denver, CO', status: 'open', urgency: 'high', createdAt: '2025-02-25', bidsCount: 1 },
];

export const MOCK_BIDS: Bid[] = [
  { id: 'b1', requestId: 'r1', requestTitle: 'Kitchen Sink Replacement', providerId: 'p1', providerName: 'Sarah Miller', providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', providerRating: 4.9, amount: 450, message: 'I can replace your sink within a day. I have experience with all major brands.', estimatedDuration: '4-6 hours', status: 'pending', createdAt: '2025-02-21' },
  { id: 'b2', requestId: 'r1', requestTitle: 'Kitchen Sink Replacement', providerId: 'p4', providerName: 'David Park', providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', providerRating: 4.6, amount: 380, message: 'Affordable sink replacement with quality work.', estimatedDuration: '3-5 hours', status: 'pending', createdAt: '2025-02-21' },
  { id: 'b3', requestId: 'r2', requestTitle: 'Living Room Repaint', providerId: 'p4', providerName: 'David Park', providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', providerRating: 4.6, amount: 650, message: 'I provide free color consultation and use premium paints.', estimatedDuration: '2 days', status: 'pending', createdAt: '2025-02-19' },
  { id: 'b4', requestId: 'r3', requestTitle: 'Electrical Panel Inspection', providerId: 'p2', providerName: 'Marcus Johnson', providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus', providerRating: 4.8, amount: 200, message: 'Certified panel inspection with detailed safety report.', estimatedDuration: '2 hours', status: 'accepted', createdAt: '2025-02-16' },
  { id: 'b5', requestId: 'r4', requestTitle: 'Deep Cleaning for Move-out', providerId: 'p3', providerName: 'Emily Torres', providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily', providerRating: 4.7, amount: 300, message: 'Eco-friendly move-out cleaning with satisfaction guarantee.', estimatedDuration: '4-5 hours', status: 'pending', createdAt: '2025-02-23' },
  { id: 'b6', requestId: 'r5', requestTitle: 'Backyard Landscaping', providerId: 'p5', providerName: 'Lisa Nguyen', providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa', providerRating: 4.9, amount: 1800, message: 'I\'d love to design a beautiful outdoor space for you.', estimatedDuration: '1-2 weeks', status: 'accepted', createdAt: '2025-01-12' },
  { id: 'b7', requestId: 'r6', requestTitle: 'Office Relocation', providerId: 'p6', providerName: 'James Wright', providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', providerRating: 4.5, amount: 1200, message: 'Full-service office move with equipment handling experience.', estimatedDuration: '1 day', status: 'pending', createdAt: '2025-02-26' },
  { id: 'b8', requestId: 'r1', requestTitle: 'Kitchen Sink Replacement', providerId: 'p6', providerName: 'James Wright', providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', providerRating: 4.5, amount: 420, message: 'I can handle basic plumbing tasks.', estimatedDuration: '5 hours', status: 'declined', createdAt: '2025-02-22' },
];

export const MOCK_REVIEWS: Review[] = [
  { id: 'rv1', providerId: 'p1', clientId: 'c5', clientName: 'Taylor Kim', clientAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor', rating: 5, comment: 'Sarah fixed our burst pipe in under an hour. Incredible response time!', createdAt: '2025-02-10' },
  { id: 'rv2', providerId: 'p1', clientId: 'c6', clientName: 'Morgan Blake', clientAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan', rating: 5, comment: 'Professional, clean, and thorough. Highly recommend.', createdAt: '2025-01-28' },
  { id: 'rv3', providerId: 'p2', clientId: 'c7', clientName: 'Casey Lee', clientAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Casey', rating: 4, comment: 'Great work on our panel upgrade. Slightly over estimated time but quality is top notch.', createdAt: '2025-02-05' },
  { id: 'rv4', providerId: 'p3', clientId: 'u1', clientName: 'Alex Chen', clientAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', rating: 5, comment: 'The apartment looks brand new after the deep clean. Amazing!', createdAt: '2025-02-12' },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  { id: 'conv1', participants: [{ id: 'u1', name: 'Alex Chen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' }, { id: 'u2', name: 'Sarah Miller', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' }], lastMessage: 'I\'ll be there at 9am tomorrow!', lastMessageAt: '2025-02-26T14:30:00', unreadCount: 1 },
  { id: 'conv2', participants: [{ id: 'u1', name: 'Alex Chen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' }, { id: 'p2u', name: 'Marcus Johnson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus' }], lastMessage: 'The inspection report is attached.', lastMessageAt: '2025-02-25T10:15:00', unreadCount: 0 },
  { id: 'conv3', participants: [{ id: 'u1', name: 'Alex Chen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' }, { id: 'p3u', name: 'Emily Torres', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily' }], lastMessage: 'What cleaning products do you prefer?', lastMessageAt: '2025-02-24T09:00:00', unreadCount: 2 },
];

export const MOCK_MESSAGES: Message[] = [
  { id: 'm1', conversationId: 'conv1', senderId: 'u1', text: 'Hi Sarah, can you come check the sink tomorrow?', createdAt: '2025-02-26T10:00:00' },
  { id: 'm2', conversationId: 'conv1', senderId: 'u2', text: 'Sure! What time works for you?', createdAt: '2025-02-26T10:15:00' },
  { id: 'm3', conversationId: 'conv1', senderId: 'u1', text: 'How about 9am?', createdAt: '2025-02-26T14:00:00' },
  { id: 'm4', conversationId: 'conv1', senderId: 'u2', text: 'I\'ll be there at 9am tomorrow!', createdAt: '2025-02-26T14:30:00' },
  { id: 'm5', conversationId: 'conv2', senderId: 'p2u', text: 'I\'ve completed the inspection. Everything looks safe but I recommend an upgrade within the year.', createdAt: '2025-02-25T10:00:00' },
  { id: 'm6', conversationId: 'conv2', senderId: 'u1', text: 'Thanks Marcus! Can you send the detailed report?', createdAt: '2025-02-25T10:10:00' },
  { id: 'm7', conversationId: 'conv2', senderId: 'p2u', text: 'The inspection report is attached.', createdAt: '2025-02-25T10:15:00' },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', userId: 'u1', type: 'bid', title: 'New Bid Received', description: 'Sarah Miller placed a bid on your Kitchen Sink Replacement request.', read: false, createdAt: '2025-02-26T14:00:00', link: '/my-bids' },
  { id: 'n2', userId: 'u1', type: 'message', title: 'New Message', description: 'Sarah Miller sent you a message.', read: false, createdAt: '2025-02-26T14:30:00', link: '/chat' },
  { id: 'n3', userId: 'u1', type: 'booking', title: 'Booking Confirmed', description: 'Your electrical panel inspection is scheduled for Feb 28.', read: true, createdAt: '2025-02-25T09:00:00', link: '/my-requests' },
  { id: 'n4', userId: 'u1', type: 'review', title: 'Leave a Review', description: 'How was your experience with Emily Torres?', read: false, createdAt: '2025-02-24T18:00:00' },
  { id: 'n5', userId: 'u2', type: 'bid', title: 'Bid Accepted!', description: 'Your bid on Kitchen Sink Replacement was accepted.', read: false, createdAt: '2025-02-26T15:00:00' },
  { id: 'n6', userId: 'u2', type: 'system', title: 'Profile Views Up', description: 'Your profile received 23 views this week!', read: true, createdAt: '2025-02-25T12:00:00' },
  { id: 'n7', userId: 'u2', type: 'verification', title: 'Verification Approved', description: 'Your professional verification has been approved.', read: true, createdAt: '2025-02-20T10:00:00' },
  { id: 'n8', userId: 'u3', type: 'system', title: 'New Provider Signup', description: 'David Park has registered as a provider.', read: false, createdAt: '2025-02-26T08:00:00' },
  { id: 'n9', userId: 'u3', type: 'verification', title: 'Verification Pending', description: 'David Park submitted verification documents.', read: false, createdAt: '2025-02-26T08:30:00' },
  { id: 'n10', userId: 'u1', type: 'system', title: 'Welcome to ServiConnect!', description: 'Start by browsing providers or posting a service request.', read: true, createdAt: '2025-01-15T10:00:00' },
];

export const MOCK_COMPLAINTS: Complaint[] = [
  { id: 'cmp1', userId: 'u1', userName: 'Alex Chen', providerId: 'p1', providerName: 'Sarah Miller', issueType: 'no_show', subject: 'Late Arrival', description: 'Provider arrived 2 hours late without notice.', status: 'open', createdAt: '2025-02-20' },
  { id: 'cmp2', userId: 'c2', userName: 'Jordan Lee', providerId: 'p3', providerName: 'Emily Torres', issueType: 'poor_quality', subject: 'Incomplete Work', description: 'The cleaning job was only partially completed.', status: 'in_review', createdAt: '2025-02-18', response: 'We are reviewing this with the provider.' },
];

export const MOCK_VERIFICATION_REQUESTS: VerificationRequest[] = [
  { id: 'vr1', providerId: 'p4', providerName: 'David Park', providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', category: 'painting', documents: ['license.pdf', 'insurance.pdf'], files: [{ name: 'license.pdf', type: 'application/pdf', size: 245000 }, { name: 'insurance.pdf', type: 'application/pdf', size: 180000 }], description: 'I have 8 years of professional painting experience with certified training.', status: 'pending', submittedAt: '2025-02-25' },
  { id: 'vr2', providerId: 'p1', providerName: 'Sarah Miller', providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', category: 'plumbing', documents: ['master-license.pdf', 'insurance.pdf', 'certifications.pdf'], files: [{ name: 'master-license.pdf', type: 'application/pdf', size: 320000 }, { name: 'certifications.pdf', type: 'application/pdf', size: 150000 }], description: 'Licensed master plumber with 15 years of experience.', status: 'approved', submittedAt: '2025-02-10', reviewedAt: '2025-02-12' },
];
