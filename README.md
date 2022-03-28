# 虚拟滚动库

#### 代码基于 [react-window](https://github.com/bvaughn/react-window) 的`Vue3`实现

## Install

```bash
# Yarn
yarn add vue3-window

# NPM
npm install --save vue3-window
```

## demo
```
<script setup>
import { FixedSizeList as List } from '@kousum/vue3-window';
</script>

<template>
  <div>
    <List
        :height="150"
        :itemCount="100000"
        :itemSize="35"
        :width="300"
    >
      <template v-slot:default="slotProps">
        <div :key="slotProps.key">
          Row {{slotProps.key}}
        </div>
      </template>
    </List>
  </div>
</template>
```
