const transitions={owner:{placed:['accepted','rejected'],accepted:['preparing'],preparing:['ready_for_pickup']},customer:{placed:['cancelled']}};
export const canTransitionOrder=(role,current,next)=>Boolean(transitions[role]?.[current]?.includes(next));
