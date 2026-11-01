
"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { useAuth } from "@/src/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";

const MAX_AUDIO_SIZE = 100 * 1024 * 1024;
const MAX_AUDIO_DURATION = 300;

const isAllowedISTTime = () => {
  const now = new Date();
  const istTime = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    })
  );

  const hour = istTime.getHours();
  return hour >= 14 && hour < 19;
};

const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);

      if (!audio.duration || Number.isNaN(audio.duration)) {
        resolve(1);
      } else {
        resolve(audio.duration);
      }
    };

    audio.onerror = () => {
      resolve(1);
    };

    audio.src = URL.createObjectURL(file);
  });
};

const AudioTweetComposer = ({
  onAudioTweetPosted,
}: {
  onAudioTweetPosted: (tweet: any) => void;
}) => {
  const { user } = useAuth();

  const [content, setContent] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [recording, setRecording] = useState(false);

  // Separate loading states
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateAudioFile = async (file: File) => {
    if (file.size > MAX_AUDIO_SIZE) {
      alert("Audio file must not exceed 100 MB.");
      return false;
    }

    const duration = await getAudioDuration(file);

    if (duration > MAX_AUDIO_DURATION) {
      alert("Audio duration must not exceed 5 minutes.");
      return false;
    }

    return true;
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      alert("No audio file selected.");
      return;
    }

    if (!file.type.startsWith("audio/")) {
      alert("Please upload only an audio file.");
      return;
    }

    const valid = await validateAudioFile(file);

    if (!valid) return;

    setAudioFile(file);
    setAudioPreview(URL.createObjectURL(file));

    alert("Audio selected successfully.");
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices) {
        alert("Recording is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: "audio/webm",
        });

        const file = new File(
          [blob],
          `audio-tweet-${Date.now()}.webm`,
          {
            type: "audio/webm",
          }
        );

        const valid = await validateAudioFile(file);

        if (!valid) return;

        setAudioFile(file);
        setAudioPreview(URL.createObjectURL(file));

        stream.getTracks().forEach((track) => track.stop());

        alert("Recording saved successfully.");
      };

      mediaRecorder.start();
      setRecording(true);

      setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          stopRecording();
          alert("Recording stopped automatically after 5 minutes.");
        }
      }, MAX_AUDIO_DURATION * 1000);
    } catch (error) {
      alert("Microphone permission denied.");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // SEND OTP
  const sendOtp = async () => {
    if (!user?.email) {
      alert("Please login first.");
      return;
    }

    try {
      setOtpLoading(true);
      setOtpSent(false);
      setOtp("");
      setOtpToken("");

      console.log("Sending OTP to:", user.email);
      console.log("Backend URL:", axiosInstance.defaults.baseURL);

      const response = await axiosInstance.post(
        "/audio-otp/send",
        {
          email: user.email,
        }
      );

      setOtpSent(true);

      console.log("OTP send response:", response.data);

      alert(
        "OTP sent successfully. Please check your registered email."
      );
    } catch (error: any) {
      console.error(
        "OTP sending failed:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to send OTP. Please try again."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // VERIFY OTP
  const verifyOtp = async () => {
    if (!user?.email) {
      alert("Please login first.");
      return;
    }

    if (!otpSent) {
      alert("Please request an OTP first.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      alert("Please enter the 6-digit OTP.");
      return;
    }

    try {
      setVerifyLoading(true);

      const res = await axiosInstance.post(
        "/audio-otp/verify",
        {
          email: user.email,
          otp,
        }
      );

      setOtpToken(res.data.token);

      alert("OTP verified successfully.");
    } catch (error: any) {
      console.error(
        "OTP verification failed:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message || "Invalid OTP"
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  // POST AUDIO TWEET
  const postAudioTweet = async () => {
    if (!user) {
      alert("Please login first.");
      return;
    }

    if (!isAllowedISTTime()) {
      alert(
        "Audio tweets are allowed only between 2:00 PM and 7:00 PM IST."
      );
      return;
    }

    if (!audioFile) {
      alert("Please record or upload audio.");
      return;
    }

    if (!otpToken) {
      alert("Please verify OTP first.");
      return;
    }

    const valid = await validateAudioFile(audioFile);

    if (!valid) return;

    let duration = await getAudioDuration(audioFile);

    if (!duration || Number.isNaN(duration)) {
      duration = 1;
    }

    const formData = new FormData();

    formData.append("author", user._id);
    formData.append("email", user.email);
    formData.append("content", content);
    formData.append("audio", audioFile);
    formData.append("audioDuration", String(duration));
    formData.append("otpToken", otpToken);

    try {
      setPosting(true);

      const res = await axiosInstance.post(
        "/audio-tweet",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      onAudioTweetPosted(res.data);

      setContent("");
      setAudioFile(null);
      setAudioPreview("");
      setOtp("");
      setOtpToken("");
      setOtpSent(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      alert("Audio tweet posted successfully.");
    } catch (error: any) {
      console.log(
        "AUDIO UPLOAD ERROR:",
        error.response?.data || error
      );

      alert(
        error.response?.data?.message ||
        "Audio tweet upload failed"
      );
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="border-b border-gray-800 p-4 bg-black">
      <h2 className="text-white font-bold mb-3">
        Audio Tweet
      </h2>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a caption for your audio tweet..."
        className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white mb-3"
      />

      <div className="flex flex-wrap gap-3 mb-3">
        <Button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          className="rounded-full"
        >
          {recording ? "Stop Recording" : "Record Voice"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="border-gray-600 text-white rounded-full"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload Audio
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.webm,.ogg,.m4a"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {audioFile && (
        <p className="text-green-400 text-sm mb-2">
          Audio ready: {audioFile.name}
        </p>
      )}

      {audioPreview && (
        <audio
          controls
          src={audioPreview}
          className="w-full mb-3"
        />
      )}

      {/* OTP VERIFICATION */}
      <div className="border border-gray-800 rounded-xl p-3 mb-3">
        <p className="text-gray-400 text-sm mb-2">
          OTP verification is required before posting audio.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={sendOtp}
            disabled={otpLoading}
            variant="outline"
            className="text-white border-gray-600"
          >
            {otpLoading ? "Sending OTP..." : "Send OTP"}
          </Button>

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) =>
              setOtp(
                e.target.value.replace(/\D/g, "").slice(0, 6)
              )
            }
            placeholder="Enter 6-digit OTP"
            aria-label="Enter 6-digit OTP"
            className="bg-black border border-gray-700 rounded-full px-4 py-2 text-white"
          />

          <Button
            type="button"
            onClick={verifyOtp}
            disabled={
              !otpSent ||
              otp.length !== 6 ||
              verifyLoading
            }
          >
            {verifyLoading ? "Verifying..." : "Verify OTP"}
          </Button>
        </div>

        {otpSent && !otpToken && (
          <p className="text-green-400 text-sm mt-2">
            OTP sent. Check your registered email and enter
            the 6-digit code.
          </p>
        )}

        {otpToken && (
          <p className="text-green-400 text-sm mt-2">
            OTP verified successfully.
          </p>
        )}
      </div>

      <Button
        onClick={postAudioTweet}
        disabled={posting}
        className="rounded-full"
      >
        {posting ? "Posting..." : "Post Audio Tweet"}
      </Button>

      <p className="text-gray-500 text-xs mt-3">
        Rules: audio must be 5 minutes or less, 100 MB or
        less, and can be posted only between 2:00 PM and
        7:00 PM IST.
      </p>
    </div>
  );
};

export default AudioTweetComposer;
