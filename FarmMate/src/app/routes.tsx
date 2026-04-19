import React from 'react';
import { Route, Router } from 'wouter';

// Pages
import HomePage from '@/pages/home/ui/HomePage';
import CalendarPage from '@/pages/calendar/ui/CalendarPage';
import FarmsPage from '@/pages/farms/ui/FarmsPage';
import MyPage from '@/pages/my-page/ui/MyPage';
import JournalPhotosPage from '@/pages/my-page/ui/JournalPhotosPage';

export function AppRoutes() {
  return (
    <Router>
      <Route path="/" component={HomePage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/farms" component={FarmsPage} />
      <Route path="/my-page/journal-photos" component={JournalPhotosPage} />
      <Route path="/my-page" component={MyPage} />
    </Router>
  );
}
