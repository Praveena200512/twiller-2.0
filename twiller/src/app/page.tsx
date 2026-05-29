import Image from "next/image";
import Landing from "../components/Landing"
import { AuthProvider } from "../context/AuthContext";
import Mainlayout from "../components/layout/Mainlayout";
export default function Home() {
  return (
    <AuthProvider>
      <Mainlayout> <Landing/> </Mainlayout>
    </AuthProvider>
  )
}