import Layout from '@/components/Layout';
import NotificationCenter from '@/components/NotificationCenter';
import React from 'react';

const Notification = () => {
    return (
        <Layout>
            <div className="min-h-screen bg-background px-3 py-6 sm:px-5 sm:py-8 lg:px-8">
                <NotificationCenter />
            </div>
        </Layout>
    );
};

export default Notification;