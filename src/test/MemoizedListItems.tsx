import {
  defineComponent, ref, h, reactive
} from 'vue'
import memoize from 'memoize-one';
import { FixedSizeList as List } from '../components/index'


const generateItems = (numItems:any) =>
  Array(numItems)
    .fill(true)
    .map(_ => ({
      isActive: false,
      label: Math.random()
        .toString(36)
        .substr(2),
    }));



interface ExampleProps {
  name?: string
}

export const vuePropsType = {
  name: String
}
interface RowType{
  data: any,
  key: any,
  index: number,
  isScrolling: any,
  style:any,
}
export const RowVuePropsType = {
  data: [String,Object,Array,Number],
  key: [Number,String],
  index: [Number],
  isScrolling: [Boolean,Object],
  style:[String,Object],
}
const Row = defineComponent<RowType>((props, ctx)=>{
  return ( )=>{
    const { items, toggleItemActive } = props.data;
    const item = items[props.index];
    return (
      <div
        onClick={() => {
          console.log(props.index)
          toggleItemActive(props.index)
        }}
        style={props.style}
      >
        {item.label} is {item.isActive ? 'active' : 'inactive'}
      </div>
    );
  }
})
Row.props = RowVuePropsType
const createItemData = memoize((items, toggleItemActive) => ({
  items,
  toggleItemActive,
}));

const Example = defineComponent<any>((props, ctx)=>{
  console.log(props)
  return ()=>{
    const itemData = createItemData(props.items, props.toggleItemActive);
    return (
      <List
        height={props.height}
        itemCount={props.items.length}
        itemData={itemData}
        itemSize={35}
        width={props.width}
      >
        {{
          default:(props_:RowType)=> {
            const { items, toggleItemActive } = props_.data;
            const item = items[props_.index];
            return (
              <div
                onClick={() => {
                  // console.log(props_.index)
                  toggleItemActive(props_.index)
                }}
                style={props_.style}
              >
                {item.label} is <span style={item.isActive ? {color:'green'} : {color:'red'}}>{item.isActive ? 'active' : 'inactive'}</span>
              </div>
            );
          }
        }}
      </List>
    )
  };
})
Example.props = {
  toggleItemActive: Function,
  height: Number,
  items: [Object,Array],
  width: Number,
}


// export default Row
const MemoizedListItems = defineComponent<ExampleProps>((props, {slots}) => {

  const state = reactive({
    items: generateItems(1000),
  });

  const toggleItemActive = (index:any) =>{
    const item = state.items[index];
    const items = state.items.concat();
    items[index] = {
      ...item,
      isActive: !item.isActive,
    };
    state.items = items
  }
  return ()=>(
    <Example
      height={150}
      items={state.items}
      toggleItemActive={toggleItemActive}
      width={300}
    />
  );

})

MemoizedListItems.props = vuePropsType

export default MemoizedListItems

