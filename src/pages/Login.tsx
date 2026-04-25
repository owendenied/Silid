import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';

export const Login = () => {
  const { user, setUser } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (isRegistering) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              role: role
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');

        const profileData = {
          id: authData.user.id,
          name,
          email,
          role,
          xp: 0,
          level: role === 'teacher' ? 'Guro' : 'Mag-aaral'
        };

        const newUser = {
          id: authData.user.id,
          role,
          name,
          email,
          xp: 0
        };
        
        // Optimistic update of store
        setUser(newUser);
        
        // Ensure profile is created in 'users' table
        const { error: profileError } = await supabase
          .from('users')
          .insert([profileData]);
          
        if (profileError) console.error("Error creating profile:", profileError);
        
      } else {
        useAppStore.getState().setInitializing(true);
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'May naganap na error.');
      useAppStore.getState().setInitializing(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isRegistering ? 'Gumawa ng Account sa Silid' : 'Mag-sign In sa Silid'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            {isRegistering && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Pangalan (Name)
                  </label>
                  <div className="mt-1">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-silid-teal focus:border-silid-teal sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ako ay isang...</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="role" 
                        value="student" 
                        checked={role === 'student'}
                        onChange={() => setRole('student')}
                        className="text-silid-teal focus:ring-silid-teal"
                      />
                      <span>Mag-aaral (Student)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="role" 
                        value="teacher" 
                        checked={role === 'teacher'}
                        onChange={() => setRole('teacher')}
                        className="text-silid-teal focus:ring-silid-teal"
                      />
                      <span>Guro (Teacher)</span>
                    </label>
                  </div>
                </div>
              </>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-silid-teal focus:border-silid-teal sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-silid-teal focus:border-silid-teal sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-silid-teal hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-silid-teal disabled:opacity-50"
              >
                {isLoading ? 'Naglo-load...' : (isRegistering ? 'Gumawa ng Account' : 'Sign in')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">O kaya ay</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={async () => {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/dashboard`
                    }
                  });
                  if (error) setError(error.message);
                }}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-silid-teal"
              >
                <img className="h-5 w-5 mr-2" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google logo" />
                Mag-sign in gamit ang Google
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="font-medium text-[var(--color-silid-teal)] hover:text-blue-800"
            >
              {isRegistering ? 'May account na? Mag-sign in.' : 'Wala pang account? Gumawa na.'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
