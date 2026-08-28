import React from "react";
import { Bell, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

import { Badge } from "@client/src/components/ui/badge";
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
    <div className="mx-auto w-full max-w-4xl space-y-12">
      <header className="space-y-5">
        <Badge
          variant="outline"
          className="border-primary/25 bg-primary/8 px-3 py-1 text-sm text-primary"
        >
          <MessageSquare className="mr-1.5 size-4" />
          反馈与通知
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          听得见的更新，收得到的回应
        </h1>
        <p className="max-w-3xl text-lg leading-9 text-muted-foreground">
          在这里查看产品的最新更新与公告，也可以随时把你的使用体验、问题和建议提交给我们——每一条反馈都会被认真看到。
        </p>
      </header>

      <Tabs defaultValue="announcements" className="gap-8">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-border/60 bg-card/50 p-2 backdrop-blur-md sm:w-fit">
          <TabsTrigger
            value="announcements"
            className="flex-none gap-2 rounded-xl px-5 py-2.5 text-[15px] font-medium text-muted-foreground transition-all data-[state=active]:bg-primary/12 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_0_1px_hsl(var(--cyber-cyan)/0.25),0_4px_20px_-8px_hsl(var(--cyber-cyan)/0.5)]"
          >
            <Bell className="size-[18px]" />
            产品通知
          </TabsTrigger>
          <TabsTrigger
            value="feedback"
            className="flex-none gap-2 rounded-xl px-5 py-2.5 text-[15px] font-medium text-muted-foreground transition-all data-[state=active]:bg-primary/12 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_0_1px_hsl(var(--cyber-cyan)/0.25),0_4px_20px_-8px_hsl(var(--cyber-cyan)/0.5)]"
          >
            <MessageSquare className="size-[18px]" />
            我的反馈
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="announcements"
          className="focus-visible:outline-none"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <AnnouncementList />
          </motion.div>
        </TabsContent>

        <TabsContent value="feedback" className="focus-visible:outline-none">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <MyFeedbackPanel />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedbackHubPage;
