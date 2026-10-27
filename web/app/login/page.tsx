import { BsCheckCircle } from "react-icons/bs";

import { FEATURE_LIST } from "@/data/loginpage.data";

import AuthForm from "../../components/loginpage/AuthForm";

export default function LoginPage() {
  return (
    <main className="flex align-center w-full h-full max-w-7xl mx-auto my-auto lg:gap-8 xl:gap-12 py-12 overflow-hidden">
      {/* Left Side - Auth Form */}
      <div className="w-full lg:w-1/2 h-full flex justify-center items-center">
        <AuthForm />
      </div>
      {/* Right Side - Feature List */}
      <div className="hidden lg:flex w-1/2 h-full flex-col justify-center items-center my-auto">
        <div className="w-full">
          <h2 className="self-start text-left text-white mb-6 text-3xl xl:text-4xl">
            Start Issuing Verified and Immutable Records
          </h2>
          {FEATURE_LIST.map((feature, idx) => (
            <div key={idx} className="flex gap-2 items-center mb-3">
              <BsCheckCircle size={24} className="text-accent" />
              <h4 className="m-0 p-0 text-accent text-base xl:text-lg">
                {feature}
              </h4>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
