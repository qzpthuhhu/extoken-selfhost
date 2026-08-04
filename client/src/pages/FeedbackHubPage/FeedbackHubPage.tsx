import React from "react";
import { Bell, MessageSquare } from "lucide-react";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@client/src/components/ui/tabs";
import AnnouncementList from "./AnnouncementList";
import MyFeedbackPanel from "./MyFeedbackPanel";

const FeedbackHubPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          <h1 className="text-lg font-semibold">反馈与通知</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          查看产品的最新更新与公告，也可以在这里向我们提交你的使用反馈与建议。
        </p>
      </header>

      <Tabs defaultValue="announcements">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="announcements" className="gap-1.5">
            <Bell className="size-4" />
            产品通知
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1.5">
            <MessageSquare className="size-4" />
            我的反馈
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="mt-4">
          <AnnouncementList />
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <MyFeedbackPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedbackHubPage;
