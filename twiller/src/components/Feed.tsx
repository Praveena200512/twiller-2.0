import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import LoadingSpinner from "./loading-spinner";
import TweetCard from "./TweetCard";
import TweetComposer from "./TweetComposer";
import axiosInstance from "@/lib/axiosInstance";

const Feed = () => {
  const [tweets, setTweets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTweet = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/post");

      console.log("TWEETS:", res.data);

      setTweets(res.data);
    } catch (error: any) {
      console.log("STATUS:", error.response?.status);
      console.log("DATA:", error.response?.data);
      console.log("FULL ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTweet();
  }, []);

  const handleNewTweet = (newTweet: any) => {
    setTweets((prev) => [newTweet, ...prev]);
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-white">Home</h1>
        </div>

        <Tabs defaultValue="foryou" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-gray-800 rounded-none h-auto">
            <TabsTrigger
              value="foryou"
              className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-1 data-[state=active]:border-blue-100 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
            >
              For you
            </TabsTrigger>

            <TabsTrigger
              value="following"
              className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-1 data-[state=active]:border-blue-100 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
            >
              Following
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <TweetComposer onTweetPosted={handleNewTweet} />

      <div className="divide-y divide-gray-800">
        {loading ? (
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400 mb-4">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p>Loading tweets...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          tweets.map((item: any) => (
            <TweetCard
              key={item._id}
              tweet={item}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Feed;