import type { Meta, StoryObj } from '@storybook/react';
import { ContactForm } from './ContactForm';

const meta: Meta<typeof ContactForm> = {
  title: 'ContactForm',
  component: ContactForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const InContainer: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <ContactForm />
    </div>
  ),
};

export const WithBackground: Story = {
  render: () => (
    <div className="bg-gradient-radial from-brand-orange via-brand-yellow to-brand-red rounded-2xl p-8">
      <div className="glass-bg-frosted glass-border-frosted glass-shadow-lg rounded-2xl border-2 p-6">
        <ContactForm />
      </div>
    </div>
  ),
};
