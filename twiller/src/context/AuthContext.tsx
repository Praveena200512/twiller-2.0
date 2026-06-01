"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { auth } from "./firebase";
import axiosInstance from "@/lib/axiosInstance";

interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  joinedDate: string;
  email: string;
  website: string;
  location: string;
}

interface AuthContextType {
  user: User | null;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  signup: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<void>;

  updateProfile: (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
  }) => Promise<void>;

  logout: () => Promise<void>;

  isLoading: boolean;

  googlesignin: () => Promise<void>;
}

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(
    null
  );

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseuser) => {
        if (firebaseuser?.email) {
          try {
            const res = await axiosInstance.get(
              "/loggedinuser",
              {
                params: {
                  email: firebaseuser.email,
                },
              }
            );

            if (res.data) {
              setUser(res.data);

              localStorage.setItem(
                "twitter-user",
                JSON.stringify(res.data)
              );
            }
          } catch (error) {
            console.log(error);
            await logout();
          }
        } else {
          setUser(null);

          localStorage.removeItem(
            "twitter-user"
          );
        }

        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Login

 const login = async (
  email: string,
  password: string
) => {
  setIsLoading(true);

  try {
    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const firebaseUser =
      userCredential.user;

    const res =
      await axiosInstance.get(
        "/loggedinuser",
        {
          params: {
            email: firebaseUser.email,
          },
        }
      );

    if (res.data) {
      setUser(res.data);

      localStorage.setItem(
        "twitter-user",
        JSON.stringify(res.data)
      );
    }
  } catch (error: any) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    alert(
      `${error.code} : ${error.message}`
    );
  } finally {
    setIsLoading(false);
  }
};
  // Signup

  const signup = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => {
    setIsLoading(true);

    try {
      const usercred =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = usercred.user;

      const newuser = {
        username,
        displayName,
        avatar: user.photoURL || "",
        email: user.email,
      };

      const res =
        await axiosInstance.post(
          "/register",
          newuser
        );

      if (res.data) {
        setUser(res.data);

        localStorage.setItem(
          "twitter-user",
          JSON.stringify(res.data)
        );
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout

  const logout = async () => {
    setUser(null);

    await signOut(auth);

    localStorage.removeItem(
      "twitter-user"
    );
  };

  // Update Profile

  const updateProfile = async (
    profileData: {
      displayName: string;
      bio: string;
      location: string;
      website: string;
      avatar: string;
    }
  ) => {
    if (!user) return;

    setIsLoading(true);

    try {
      const updatedUser: User = {
        ...user,
        ...profileData,
      };

      const res =
        await axiosInstance.patch(
          `/userupdate/${user.email}`,
          updatedUser
        );

      if (res.data) {
        setUser(updatedUser);

        localStorage.setItem(
          "twitter-user",
          JSON.stringify(updatedUser)
        );
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign In

 const googlesignin = async () => {
  setIsLoading(true);

  try {
    const provider =
      new GoogleAuthProvider();

    const result =
      await signInWithPopup(
        auth,
        provider
      );

    const firebaseuser =
      result.user;

    if (!firebaseuser.email) {
      throw new Error(
        "No email found"
      );
    }

    let userData;

    try {
      const res =
        await axiosInstance.get(
          "/loggedinuser",
          {
            params: {
              email:
                firebaseuser.email,
            },
          }
        );

      userData = res.data;
    } catch {
      const newuser = {
        username:
          firebaseuser.email.split(
            "@"
          )[0],
        displayName:
          firebaseuser.displayName ||
          "User",
        avatar:
          firebaseuser.photoURL ||
          "",
        email:
          firebaseuser.email,
      };

      const registerRes =
        await axiosInstance.post(
          "/register",
          newuser
        );

      userData =
        registerRes.data;
    }

    setUser(userData);

    localStorage.setItem(
      "twitter-user",
      JSON.stringify(userData)
    );

    window.location.href = "/";
  } catch (error) {
    console.error(error);
  } finally {
    setIsLoading(false);
  }
};
  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        updateProfile,
        logout,
        isLoading,
        googlesignin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};