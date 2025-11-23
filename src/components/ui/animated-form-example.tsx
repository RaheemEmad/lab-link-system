import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Example component demonstrating animated form inputs with validation
 * Features:
 * - Blue/teal focus states with gradient borders
 * - Smooth scale and shadow animations
 * - Animated validation feedback
 * - Success/error states with visual feedback
 */
export const AnimatedFormExample = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);
  
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState("");
  
  const [category, setCategory] = useState("");

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError("Email is required");
      setEmailSuccess(false);
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Please enter a valid email address");
      setEmailSuccess(false);
      return false;
    }
    setEmailError("");
    setEmailSuccess(true);
    return true;
  };

  const validateMessage = (value: string) => {
    if (!value) {
      setMessageError("Message is required");
      return false;
    }
    if (value.length < 10) {
      setMessageError("Message must be at least 10 characters");
      return false;
    }
    setMessageError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isEmailValid = validateEmail(email);
    const isMessageValid = validateMessage(message);
    
    if (isEmailValid && isMessageValid && category) {
      console.log("Form submitted:", { email, message, category });
      // Handle successful submission
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto space-y-6 p-6 rounded-xl bg-card border shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Animated Form Demo
        </h2>
        <p className="text-sm text-muted-foreground">
          Experience smooth microinteractions and validation feedback
        </p>
      </div>

      {/* Email Input */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError || emailSuccess) {
              validateEmail(e.target.value);
            }
          }}
          onBlur={(e) => validateEmail(e.target.value)}
          error={!!emailError}
          success={emailSuccess}
        />
        {emailError && <FormFeedback type="error" message={emailError} />}
        {emailSuccess && !emailError && (
          <FormFeedback type="success" message="Email looks good!" />
        )}
      </div>

      {/* Category Select */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General Inquiry</SelectItem>
            <SelectItem value="support">Support</SelectItem>
            <SelectItem value="feedback">Feedback</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Message Textarea */}
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Type your message here..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (messageError) {
              validateMessage(e.target.value);
            }
          }}
          onBlur={(e) => validateMessage(e.target.value)}
          error={!!messageError}
          rows={4}
        />
        {messageError && <FormFeedback type="error" message={messageError} />}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="gradient"
        className="w-full"
      >
        Submit Form
      </Button>

      {/* Info Box */}
      <FormFeedback
        type="info"
        message="This form demonstrates animated inputs with blue/teal focus states and smooth validation feedback."
      />
    </motion.form>
  );
};

export default AnimatedFormExample;
