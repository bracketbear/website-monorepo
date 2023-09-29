import { describe, expect, beforeEach, it, test } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from './Button.vue'

describe('Button', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(Button)
  })

  it('should render correctly', () => {
    expect(wrapper.vm.html()).toMatchSnapshot()
  })

  // test('should render a button', () => {
  //   expect(wrapper.vm.find('button').exists()).toBe(true)
  // })
})
