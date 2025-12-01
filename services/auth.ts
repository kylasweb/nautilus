
import { User } from '../types';

// Mock User Database
const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@nautilus.com',
    role: 'Admin',
    avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=3b82f6&color=fff'
  },
  {
    id: '2',
    name: 'Sarah Analyst',
    email: 'analyst@nautilus.com',
    role: 'Analyst',
    avatar: 'https://ui-avatars.com/api/?name=Sarah+Analyst&background=10b981&color=fff'
  },
  {
    id: '3',
    name: 'Visitor View',
    email: 'viewer@nautilus.com',
    role: 'Viewer',
    avatar: 'https://ui-avatars.com/api/?name=Visitor+View&background=64748b&color=fff'
  }
];

export const authenticateUser = async (email: string, password: string): Promise<User | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Simple Mock Logic: Check if email exists in mock DB.
  // In a real app, verify password hash. Here we assume password is 'password' or specific suffix for demo.
  const user = MOCK_USERS.find(u => u.email === email);
  
  if (user) {
    // Basic password check for demo purposes
    if (password === 'admin123' && user.role === 'Admin') return user;
    if (password === 'analyst123' && user.role === 'Analyst') return user;
    if (password === 'viewer123' && user.role === 'Viewer') return user;
    
    // Allow generic password for ease of testing if strict password fails
    if (password === 'password') return user; 
  }

  return null;
};
