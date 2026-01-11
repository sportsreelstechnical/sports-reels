import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Users,
  Target,
  Zap
} from 'lucide-react';

const BulkUploadDemo: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "Download Template",
      description: "Get sport-specific CSV template",
      icon: <Download className="w-5 h-5" />,
      details: [
        "Template matches your team's sport type",
        "Includes all required and optional fields",
        "Sample data shows proper format",
        "Ready to fill with your player data"
      ]
    },
    {
      title: "Prepare Your Data",
      description: "Fill in player information",
      icon: <FileText className="w-5 h-5" />,
      details: [
        "Enter player names, positions, and basic info",
        "Include age, height, weight, citizenship",
        "Add optional details like market value",
        "Save as CSV or Excel format"
      ]
    },
    {
      title: "Upload & Validate",
      description: "Upload file and review data",
      icon: <Upload className="w-5 h-5" />,
      details: [
        "Drag & drop or browse for your file",
        "Automatic validation of all data",
        "Preview players before uploading",
        "Edit any incorrect information"
      ]
    },
    {
      title: "Complete Upload",
      description: "Add players to your roster",
      icon: <CheckCircle className="w-5 h-5" />,
      details: [
        "Upload valid players to database",
        "View upload summary and results",
        "Track upload history",
        "Players appear in your roster"
      ]
    }
  ];

  const features = [
    {
      title: "Multi-Format Support",
      description: "CSV and Excel files",
      icon: <FileText className="w-6 h-6 text-blue-400" />
    },
    {
      title: "Sport-Specific Templates",
      description: "Templates match your sport",
      icon: <Target className="w-6 h-6 text-green-400" />
    },
    {
      title: "Smart Validation",
      description: "Catch errors before upload",
      icon: <AlertCircle className="w-6 h-6 text-yellow-400" />
    },
    {
      title: "Bulk Processing",
      description: "Upload hundreds at once",
      icon: <Zap className="w-6 h-6 text-purple-400" />
    }
  ];

  const benefits = [
    "Save hours of manual data entry",
    "Reduce human errors with validation",
    "Ensure data consistency across players",
    "Easy to use for non-technical users",
    "Track upload history and success rates",
    "Edit data before final upload"
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">
          Bulk Player Upload
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
          Efficiently add multiple players to your roster using CSV or Excel files. 
          Save time, reduce errors, and maintain data consistency.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <Card key={index} className="bg-gray-800 border-gray-700">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Process Steps */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-center">
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  activeStep === index 
                    ? 'bg-rosegold text-white' 
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {step.icon}
                </div>
                <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{step.description}</p>
                <ul className="text-left text-xs text-gray-500 space-y-1">
                  {step.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-start">
                      <span className="text-rosegold mr-2">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-center">
            Why Use Bulk Upload?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-gray-300">{benefit}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sample Data Preview */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">
            Sample CSV Template (Football)
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Download a template that matches your team's sport type
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm text-gray-300">
{`Name,Position,Jersey Number,Age,Height (cm),Weight (kg),Citizenship,Gender,Date of Birth,Place of Birth,Preferred Foot,FIFA ID,Bio,Market Value
John Doe,Goalkeeper,1,25,185,80,United States,male,1999-01-15,New York USA,right,123456,Experienced goalkeeper,1000000
Jane Smith,Striker,9,23,170,65,Canada,female,2001-03-20,Toronto Canada,left,789012,Quick and agile striker,800000
Mike Johnson,Defender,4,28,190,85,England,male,1996-07-10,London UK,right,345678,Solid center back,600000`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">
          Ready to Get Started?
        </h2>
        <p className="text-gray-400">
          Access the bulk upload feature from your Player Management dashboard
        </p>
        <div className="flex justify-center gap-4">
          <Button className="bg-rosegold hover:bg-rosegold/90 text-white">
            <Users className="w-4 h-4 mr-2" />
            Go to Player Management
          </Button>
          <Button variant="outline" className="text-white border-gray-600">
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadDemo;
