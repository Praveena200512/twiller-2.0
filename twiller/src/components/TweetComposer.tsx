import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

import {
  BarChart3,
  Calendar,
  Globe,
  MapPin,
  Smile,
  Image,
} from "lucide-react";

import axios from "axios";
import axiosInstance from "@/lib/axiosInstance";

const TweetComposer = ({ onTweetPosted }: any) => {
  const { user } = useAuth();

  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  const maxlength = 200;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !content.trim()) return;

    setPosting(true);

    try {
      const tweetdata = {
        author: user._id,
        content: content.trim(),
        image: imageUrl || "",
      };

      const res = await axiosInstance.post("/post", tweetdata);

      onTweetPosted(res.data);

      setContent("");
      setImageUrl("");
    } catch (error: any) {
      console.log("POST ERROR:", error.response?.data || error.message);
    } finally {
      setPosting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await axios.post(
        `https://api.imgbb.com/1/upload?key=5a64c1220137ccf5a3b240a89405d6eb`,
        formData
      );

      const url = res.data?.data?.display_url;

      if (url) {
        setImageUrl(url);
      } else {
        console.log("Upload failed: No URL returned");
      }
    } catch (error: any) {
      console.log("UPLOAD ERROR:", error.response?.data || error.message);
    } finally {
      setUploading(false);
    }
  };

  const charCount = content.length;
  const isOverLimit = charCount > maxlength;
  const isNearLimit = charCount > maxlength * 0.8;

  if (!user) return null;

  return (
    <Card className="bg-black border-gray-800 border-x-0 border-t-0 rounded-none">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar} />
            <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <form onSubmit={handleSubmit}>
              <Textarea
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-transparent border-none text-xl text-white placeholder-gray-500 resize-none min-h-[120px] focus-visible:ring-0"
              />

              {/* IMAGE PREVIEW */}
              {imageUrl && (
                <div className="mt-2">
                  <img
                    src={imageUrl}
                    alt="upload"
                    className="rounded-xl max-h-60 object-cover"
                  />
                </div>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4 text-blue-400">
                  <label className="cursor-pointer p-2 rounded-full hover:bg-blue-900/20">
                    <Image className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                    />
                  </label>

                  <Button type="button" variant="ghost">
                    <BarChart3 className="h-5 w-5" />
                  </Button>

                  <Button type="button" variant="ghost">
                    <Smile className="h-5 w-5" />
                  </Button>

                  <Button type="button" variant="ghost">
                    <Calendar className="h-5 w-5" />
                  </Button>

                  <Button type="button" variant="ghost">
                    <MapPin className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-sm text-blue-400 flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>Everyone can reply</span>
                  </div>

                  {/* CHAR COUNTER */}
                  {charCount > 0 && (
                    <span
                      className={`text-sm ${
                        isOverLimit
                          ? "text-red-500"
                          : isNearLimit
                          ? "text-yellow-500"
                          : "text-blue-400"
                      }`}
                    >
                      {maxlength - charCount}
                    </span>
                  )}

                  <Separator orientation="vertical" className="h-6 bg-gray-700" />

                  <Button
                    type="submit"
                    disabled={!content.trim() || isOverLimit || posting}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 text-white rounded-full px-6"
                  >
                    {posting ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TweetComposer;