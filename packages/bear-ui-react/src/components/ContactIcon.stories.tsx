import type { Meta, StoryObj } from '@storybook/react';
import { ContactIcon } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof ContactIcon> = {
  title: 'ContactIcon',
  component: ContactIcon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: { type: 'select' },
      options: ['mail', 'github', 'linkedin', 'phone', 'twitter', 'website'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Mail: Story = {
  args: {
    name: 'mail',
  },
};

export const GitHub: Story = {
  args: {
    name: 'github',
  },
};

export const LinkedIn: Story = {
  args: {
    name: 'linkedin',
  },
};

export const Phone: Story = {
  args: {
    name: 'phone',
  },
};

export const Twitter: Story = {
  args: {
    name: 'twitter',
  },
};

export const Website: Story = {
  args: {
    name: 'website',
  },
};

export const AllIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col items-center gap-2">
        <ContactIcon name="mail" className="text-blue-500" />
        <span className="text-sm">Mail</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ContactIcon name="github" className="text-gray-800" />
        <span className="text-sm">GitHub</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ContactIcon name="linkedin" className="text-blue-600" />
        <span className="text-sm">LinkedIn</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ContactIcon name="phone" className="text-green-500" />
        <span className="text-sm">Phone</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ContactIcon name="twitter" className="text-blue-400" />
        <span className="text-sm">Twitter</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ContactIcon name="website" className="text-purple-500" />
        <span className="text-sm">Website</span>
      </div>
    </div>
  ),
};

export const CustomSize: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ContactIcon
        name="mail"
        width={16}
        height={16}
        className="text-blue-500"
      />
      <ContactIcon
        name="mail"
        width={24}
        height={24}
        className="text-blue-500"
      />
      <ContactIcon
        name="mail"
        width={32}
        height={32}
        className="text-blue-500"
      />
      <ContactIcon
        name="mail"
        width={48}
        height={48}
        className="text-blue-500"
      />
    </div>
  ),
};

export const CustomStyling: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <ContactIcon
        name="mail"
        className="cursor-pointer text-blue-500 transition-colors hover:text-blue-600"
      />
      <ContactIcon
        name="github"
        className="cursor-pointer text-gray-800 transition-colors hover:text-gray-900"
      />
      <ContactIcon
        name="linkedin"
        className="cursor-pointer text-blue-600 transition-colors hover:text-blue-700"
      />
    </div>
  ),
};
